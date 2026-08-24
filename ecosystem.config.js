module.exports = {
  apps: [
    {
      name: 'healthcare-management',
      script: './server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      time: true,
      env: {
        PORT: 3102,
        NODE_ENV: 'production',
      },
    },
    /*
      The appointment reminder sweep, run on a schedule rather than by an in-process timer — a
      serverless or restart-prone instance is not alive when a reminder comes due. It is a one-shot
      that exits after a single pass (autorestart off), re-launched every fifteen minutes by
      cron_restart. The sweep is idempotent, so a double run sends one reminder per appointment and a
      missed run sends late rather than never.

      `reminders:run` runs through the same toolchain the seed and verify scripts use, so install the
      dependencies with a plain `npm ci` (not `--omit=dev`) on the server, or drop this app and call
      `npm run reminders:run` from a system crontab instead — either way it is the same idempotent
      sweep.
    */
    {
      name: 'healthcare-reminders',
      script: 'npm',
      args: 'run reminders:run',
      autorestart: false,
      cron_restart: '*/15 * * * *',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
