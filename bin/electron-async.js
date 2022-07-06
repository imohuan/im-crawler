#!/usr/bin/env node
const { spawn } = require("child_process");
const electron = require("electron");
spawn("chcp", ["65001"]);
spawn(electron, ["index.js"], { stdio: "inherit", cwd: __dirname });
