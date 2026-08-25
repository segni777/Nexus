import { env } from './config/env.js';
import { createServer } from './server.js';

const app = await createServer();
app.listen(env.PORT, () => {
  console.log(`API ready: http://localhost:${env.PORT}/graphql`);
});
