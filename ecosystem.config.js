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
  ],
};
