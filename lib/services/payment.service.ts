import { Invoice } from '@/models/invoice.model';
import { Payment } from '@/models/payment.model';
import { InvoiceDto, PaymentDto, SessionUser, paymentFromEntity } from '@/types';

import { INVOICE_STATUSES } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';

import { gateway } from '@/lib/billing';
import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure } from '@/lib/result';
import type { PaymentRecordOutput } from '@/lib/schemas';
import { derivePaidStatus } from '@/lib/utils';

import { InvoiceService } from './invoice.service';

import type { InvoiceEntity } from '@/models/invoice.model';
import type { PaymentEntity } from '@/models/payment.model';

const log = createLoggerWithContext('payment.service');

const DATABASE = CODES.DATABASE.PAYMENTS;
const VALIDATION = CODES.VALIDATION.PAYMENTS;
const BUSINESS = CODES.BUSINESS.PAYMENTS;
const INVOICES_VALIDATION = CODES.VALIDATION.INVOICES;

/*
  Recording money against an invoice, and reading the history of it.

  Two things carry the weight. A payment is taken **through the gateway**, so the counter today and a
  real online provider tomorrow are the same call. And the invoice's paid amount is recomputed from
  the **sum of its payments**, not incremented in place — so two payments landing at once cannot race
  each other into a wrong total, and the status follows from that sum rather than being set by hand.
  Overpayment is refused rather than silently accepted: a refund is a decision with a policy, not a
  negative payment.
*/
export class PaymentService {
  private readonly invoiceService = new InvoiceService();

  /**
   * Record a payment against an invoice and move the invoice along.
   *
   * @param input - The invoice, the amount (already integer minor units), the method and a reference.
   * @param requester - The account taking the payment.
   *
   * @returns The updated invoice, or a failure.
   */
  public async record(input: PaymentRecordOutput, requester: SessionUser): Promise<SingleResult<InvoiceDto>> {
    try {
      await connectToDatabase();

      const invoice = await Invoice.findById(input.invoiceId).lean<InvoiceEntity | null>();

      if (!invoice) {
        return singleFailure(createError(INVOICES_VALIDATION.INVOICE_NOT_FOUND.CODE, INVOICES_VALIDATION.INVOICE_NOT_FOUND.MESSAGE));
      }

      if (invoice.status === INVOICE_STATUSES.VOID) {
        return singleFailure(createError(BUSINESS.INVOICE_VOID.CODE, BUSINESS.INVOICE_VOID.MESSAGE));
      }

      const balance = invoice.totalMinorUnits - invoice.paidMinorUnits;

      if (balance <= 0) {
        return singleFailure(createError(BUSINESS.INVOICE_ALREADY_PAID.CODE, BUSINESS.INVOICE_ALREADY_PAID.MESSAGE));
      }

      // A friendly early refusal on the read balance; the atomic reserve below is the real gate.
      if (input.amountMinorUnits > balance) {
        return singleFailure(createError(VALIDATION.EXCEEDS_BALANCE.CODE, VALIDATION.EXCEEDS_BALANCE.MESSAGE, 'amountMinorUnits'));
      }

      /*
        The real gate: reserve the amount **atomically**. The `$expr` keeps the increment within the
        total in the same round trip as the increment, so two payments recorded on one invoice at once
        cannot both pass a stale-balance check and overpay it — the second finds no room and is
        refused. `$ne void` refuses a bill that was voided in the meantime. Reserving before the
        gateway means a refused capture releases the room rather than the other way around.
      */
      const reserved = await Invoice.findOneAndUpdate(
        {
          _id: input.invoiceId,
          status: { $ne: INVOICE_STATUSES.VOID },
          $expr: { $lte: [{ $add: ['$paidMinorUnits', input.amountMinorUnits] }, '$totalMinorUnits'] },
        },
        { $inc: { paidMinorUnits: input.amountMinorUnits } },
        { returnDocument: 'after' }
      ).lean<InvoiceEntity | null>();

      if (!reserved) {
        // A concurrent payment took the balance, or the invoice went void — refused, before any money.
        return singleFailure(createError(VALIDATION.EXCEEDS_BALANCE.CODE, VALIDATION.EXCEEDS_BALANCE.MESSAGE, 'amountMinorUnits'));
      }

      const outcome = await gateway.capture({
        amountMinorUnits: input.amountMinorUnits,
        method: input.method,
        reference: this.optionalText(input.reference),
      });

      if (!outcome.captured) {
        // The money was not taken — release the reservation so the paid amount does not drift up.
        await Invoice.updateOne({ _id: input.invoiceId }, { $inc: { paidMinorUnits: -input.amountMinorUnits } });

        return singleFailure(createError(BUSINESS.GATEWAY_REFUSED.CODE, BUSINESS.GATEWAY_REFUSED.MESSAGE));
      }

      try {
        await Payment.create({
          invoice: reserved._id,
          amountMinorUnits: input.amountMinorUnits,
          method: input.method,
          reference: outcome.reference ?? undefined,
          receivedBy: requester.userId,
          receivedAt: new Date(),
        });
      } catch (error) {
        // The reservation landed but its record did not — release it so paid matches the payments.
        await Invoice.updateOne({ _id: input.invoiceId }, { $inc: { paidMinorUnits: -input.amountMinorUnits } });
        log.error({ err: error }, 'Recording a payment row failed');

        return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
      }

      // The status follows from the reserved (post-increment) paid amount, which the `$expr` bounded to the total.
      await Invoice.updateOne({ _id: input.invoiceId }, { status: derivePaidStatus(reserved.totalMinorUnits, reserved.paidMinorUnits) });

      return this.invoiceService.getById(input.invoiceId);
    } catch (error) {
      log.error({ err: error }, 'Recording a payment failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * An invoice's payment history, in the order the payments were taken.
   *
   * @param invoiceId - The invoice.
   *
   * @returns The payments as DTOs.
   */
  public async listForInvoice(invoiceId: string): Promise<ListResult<PaymentDto>> {
    try {
      await connectToDatabase();

      const payments = await Payment.find({ invoice: invoiceId }).sort({ receivedAt: 1 }).lean<PaymentEntity[]>();

      return listSuccess(payments.map(paymentFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing payments failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }
}
