#!/usr/bin/env node
import { runCli } from "../dist/src/cli.js";

const exitCode = await runCli();
process.exitCode = exitCode;
