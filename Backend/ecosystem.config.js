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
  ],
};
