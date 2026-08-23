import mongoose from 'mongoose';

import { connectToDatabase } from '@/lib/mongodb';
import { ReminderService } from '@/lib/services';

/*
  The scheduled reminder sweep, run by cron or PM2 rather than an in-process timer — a serverless
  instance is not alive when a reminder comes due. It is idempotent: running it twice sends one
  reminder per appointment, and a missed run sends late rather than never.
*/
async function run(): Promise<void> {
  await connectToDatabase();

  const reminders = new ReminderService();
  const summary = await reminders.sweep();

  console.log(`Reminder sweep: examined ${summary.examined} appointment(s), wrote ${summary.created} new reminder(s).`);

  await mongoose.disconnect();
}

run().catch(async error => {
  console.error('Reminder sweep failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
