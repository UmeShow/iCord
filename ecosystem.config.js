module.exports = {
  apps : [{
    name   : "icord-me-bot",
    script : "src/index.ts",
    interpreter: "node",
    interpreter_args: "-r ts-node/register",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    },
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000
  }]
}
