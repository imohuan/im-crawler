declare module "winston/lib/winston/transports" {
  interface Transports {
    DailyRotateFile: typeof DailyRotateFile;
    DailyRotateFileTransportOptions: DailyRotateFile.DailyRotateFileTransportOptions;
  }
}
