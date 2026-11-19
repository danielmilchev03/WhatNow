import { createAppServer } from './app';
import { config } from './config';

const { httpServer } = createAppServer();

httpServer.listen(config.port, () => {
  console.log(`WhatNow server listening on http://localhost:${config.port}`);
});
