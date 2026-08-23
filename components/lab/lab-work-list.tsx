import { LabWorkRow } from './lab-work-row';

import type { LabOrderRow } from './lab.types';

type LabWorkListProps = {
  orders: LabOrderRow[];
};

/*
  The lab's work list — every outstanding order, most urgent first, each with the controls for its
  next move. A plain list: the interactivity lives per-row in the action island, so the list itself
  stays a server component and a mutation reloads it.
*/
export function LabWorkList({ orders }: LabWorkListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {orders.map(order => (
        <LabWorkRow key={order.labOrderId} order={order} />
      ))}
    </ul>
  );
}
