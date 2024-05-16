module.exports = {
  apps : [{
    name   : "discordbot",
    script : "./data/index.js",
    watch : ["./data"],
    watch_delay: 1000,
    ignore_watch: ["./node_modules", "\\.git", "./logs", "*.log"]
  }]
}
