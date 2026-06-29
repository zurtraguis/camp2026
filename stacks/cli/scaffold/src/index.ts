#!/usr/bin/env node
import { Command } from "commander";
import { z } from "zod";

const program = new Command();

program
  .name("harness-cli-app")
  .description("Minimal CLI scaffold from VibeCoding harness (CLI stack).")
  .version("0.1.0");

program
  .command("greet")
  .description("Greet a user.")
  .argument("<name>", "name to greet")
  .option("-l, --loud", "uppercase output")
  .action((rawName, opts) => {
    const name = z.string().min(1).max(80).parse(rawName);
    const msg = `Hello, ${name}!`;
    console.log(opts.loud ? msg.toUpperCase() : msg);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
