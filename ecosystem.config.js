module.exports = {
  apps: [
    {
      name: 'afterhourfix-worker',
      script: 'node',
      args: ['-r', 'tsx/register', 'worker/index.ts'],
      env: {
        NODE_ENV: 'production',
        BULLMQ_ENABLED: 'true',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
    },
  ],
}

