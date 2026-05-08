module.exports = {
  apps: [
    {
      name: "resume-backend",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "resume-worker",
      script: "npm",
      args: "run worker:resume-download",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
