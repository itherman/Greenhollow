declare module "playwright" {
  export const chromium: {
    launch(opts?: any): Promise<any>;
  };
}
