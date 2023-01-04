import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import https from "https";
import { ApolloServer } from "@apollo/server";
import gql from 'graphql-tag';
import cors from "cors";
import { json } from "body-parser";
import fetcher from 'make-fetch-happen';
import HttpAgent from 'agentkeepalive';
 
// Self signed certificates for localhost genreated with
//   openssl req -x509 -sha256 -nodes -newkey rsa:2048 -days 365 -keyout localhost.key -out localhost.crt
const SERVER_CERTIFICATE = ""
const SERVER_CERTIFICATE_KEY = ""
 
const APPLICATION='test-app'
const PORT=4001
const FETCHDELAY=4999
 
const HttpsAgent = HttpAgent.HttpsAgent
 
const fetch = fetcher.defaults({
  // Allow an arbitrary number of sockets per subgraph. This is the default
  // behavior of Node's http.Agent as well as the npm package agentkeepalive
  // which wraps it, but is not the default behavior of make-fetch-happen
  // which wraps agentkeepalive (that package sets this to 15 by default).
  maxSockets: Infinity,
  // although this is the default, we want to take extra care and be very
  // explicity to ensure that mutations cannot be retried. please leave this
  // intact.
  retry: false,
 
  // Additional option to allow self signed certs to be used in test app
  strictSSL: false,
 
  // Option 1 to resolve the issue. Define your own agent which allows you to
  // set a freeSocketTimeout timout which is less than the default server keep
  // alive timeout of 5000ms. (uncomment code below)
 
  agent: new HttpsAgent({
    maxSockets: Infinity,
    cert: SERVER_CERTIFICATE,
    key : SERVER_CERTIFICATE_KEY,
    timeout : 0,
    freeSocketTimeout: 4500
  }),
 
});
 
const typeDefs = gql`
type Query {
  numberSix: Int!
  numberSeven: Int!
}
`;
 
const resolvers = {
  Query: {
    numberSix() {
      return 6;
    },
    numberSeven() {
      return 7;
    },
  },
};
 
interface AppContext {
}
 
export async function startApolloServer() {
 
  console.log(`Starting ${APPLICATION}`);
 
  // Setting up server side
  const httpsServerOptions = { cert: SERVER_CERTIFICATE, key: SERVER_CERTIFICATE_KEY };
 
  const app = express();
  const server = https.createServer(httpsServerOptions, app);
 
  // Option 2 for resolving this issue. Set the server side keep alive to higher
  // than the hard coded freeSocketTimeout: 15000 in make-fetch-happen
  //
  // server.keepAliveTimeout=16000
 
  const apolloServer = new ApolloServer<AppContext>({
    typeDefs: typeDefs,
    resolvers: resolvers
  });
  await apolloServer.start();
 
  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    json({}),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        return {
          dataSources: null,
        };
      },
    }),
  );
 
  const httpsServer = await new Promise<void>((resolve) => server.listen({ port: PORT }, resolve));
  const url = `https://localhost:${PORT}/graphql`;
  console.log(`${APPLICATION} running at ${url}`);
 
  // Running client and simulating requests
  var successes = 0;
  var failures: any = {};
 
  for (var i = 0; i < 50; i++) {
    console.log(`Request attempt ${i}`)
    await new Promise(r => setTimeout(r, FETCHDELAY));
    await fetch(`https://localhost:${PORT}/graphql`, {
      method: 'POST',
      body: '{"query":"query { numberSix, numberSeven }"}',
      headers: { 'Content-Type': 'application/json' }
    })
        .then((r) => {
            successes++;
            console.log(`Successes`)
        })
        .catch((e) => {
            failures[e.message] = (failures[e.message] || 0) + 1;
            console.log(e.message)
        });
  }
 
  console.log({ successes, failures });
  console.log(`Shutting down`);
}
 
startApolloServer()