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
const SERVER_CERTIFICATE = "-----BEGIN CERTIFICATE-----\nMIIDkzCCAnugAwIBAgIUCgXK1XAAd1eycik/sm6WsxU4MIswDQYJKoZIhvcNAQEL\nBQAwWTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM\nGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MB4X\nDTIzMDEwNDEyMTM1OVoXDTI0MDEwNDEyMTM1OVowWTELMAkGA1UEBhMCQVUxEzAR\nBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5\nIEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\nMIIBCgKCAQEAxT8B8dpOJLm2gO9ja5+y1duC74FdPyU84/iFVXuP+kteTj3JfdiP\n4H91FyhrU0UFcZ9l22A7dbNciFwnoE0Jfyyin5E16K/sGFKeOXBokzc9Lrq3Ue5t\nAa75fCroPHjyLwa2/s67wfQ1n10dBgyqGAaCIBSm1L7Tayb7wahXLUp8vtAfmYmP\nBxV72awvwfLCUNyHiPnHIXYBXQmS40iqclFW1mciA1Ci2zbq7HYpZuMiDqK8RCdu\nF5xsvY26lg6ViDzINWu49DTM+ByPsUiTpeV3a4nhuyhWlap0bMBevCo1pRnBnZHv\nnxQ9F3ZK8187mZ3rpWScnn89H19WCbMYCwIDAQABo1MwUTAdBgNVHQ4EFgQUbu6z\nARxWySnK4i6+uphiY4uEP10wHwYDVR0jBBgwFoAUbu6zARxWySnK4i6+uphiY4uE\nP10wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEArYYvgazfeosp\n9PrCvirArP2A0Hfjz9vroBupd8ACsAz/wC1aI5j31v0LOwhyYUm861SZB658jA1h\nUyXRmnxS3cuD/gyWSYxyfL3oYlxLsX9xizmrc0PPHqyryB0XEpvEWKzdGMo/zQl6\nqNH33WjSScPDcD7J/LehcDow06U4sIFsHAFZwVlHHItXZ5tp2Oh1CP2E4cnwyjHu\nZHATuMV6FJ0E5blxp1FpeXr5NgI/Oo9ApI6Xb15O23RFWLAtG4tD0LbG99v19JGk\nl6URn/OqfzlMZmXsC+ydokLYNodDbxkPK0rV80FtaiNe2j4aha8W12IMHhM675zH\nLrOHI05ntQ==\n-----END CERTIFICATE-----\n"
const SERVER_CERTIFICATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFPwHx2k4kubaA\n72Nrn7LV24LvgV0/JTzj+IVVe4/6S15OPcl92I/gf3UXKGtTRQVxn2XbYDt1s1yI\nXCegTQl/LKKfkTXor+wYUp45cGiTNz0uurdR7m0Brvl8Kug8ePIvBrb+zrvB9DWf\nXR0GDKoYBoIgFKbUvtNrJvvBqFctSny+0B+ZiY8HFXvZrC/B8sJQ3IeI+cchdgFd\nCZLjSKpyUVbWZyIDUKLbNursdilm4yIOorxEJ24XnGy9jbqWDpWIPMg1a7j0NMz4\nHI+xSJOl5XdrieG7KFaVqnRswF68KjWlGcGdke+fFD0XdkrzXzuZneulZJyefz0f\nX1YJsxgLAgMBAAECggEBAJKWRdq4k7SFdBWUUv3L3HtEvKVELclc4kjGDElAH/sy\nge6ByrnE9QAxmRJRzpk+xVHw1SDY/rd1ScJpQmXGetVRlbYik77O5xYYaFBlssId\nnlGZH9465DYJFI5r0NYISGwcgGkTuMPmuucpqwUw6kQaqiAvWODoxHRwr073zXnx\nADIc0tW+dkReUv5o/rbKYZJKetnaZfhFSr29Izjnmolfd5HLS/chGzKtpjbEvAiI\ny7hAYGGhLTNNuIn9Z2mH2Hv9UrQE71QJSSS0/UAs5fcVOVxLijXMLcF0TGilvo0/\nKMUOuq8onQlwcu0QHWCa7M9UQ4kRVrdg6D09DOiI5vkCgYEA61/TB5xEqf29ZuXh\nYFuYEXc5YKwFLcIHa+0wFKprz2EWYs2JZSRfVPQWaFAwSlaFqdplsxJIG2UryBGv\nx0apY9F7px04LhipXhubvzqpGvCSyed2V2G7/ojjjSD7kWwPcQAC0CM8zsdWaNZz\nQNqowfksyOmNTLcE0w5F7M+ZEi8CgYEA1ofZh+52BhEixFh76jkWgviYfdsKed/f\n7qTTqLEDexHEMkwj3yN8yjTO5hX5RlXEm/zRNqkMCFiz0/ZaGnwEvSI6Q4U52RMD\nwWoKJu0IRzC7EUpWlcOMOuFbExsrdAhCjpb0CIww+b9Rp+0hB1P5X3yUNegJCUof\nPPlBg7sGbOUCgYBmGhpD6eDLUNuxYDUFBJaRtQM50UUp1Uo84hYCUO8VdYstbvWT\n31RPWNbDh017Yc73oFqPdHW9FIUKc8mpixh9yWh3VLCDJoWJ4jYMnRiwK/2xAewO\n+cGAJ8d1+AHI0nRcU2HlAfQlysjMD4LNdkzQYBOyT8XQqm+4Ui+5C1DeVwKBgBn9\ns3kohtwNT20CW2DxMa0EeVUmKIrDeNns1kflykoqyN5fIylxnzjQVRDDMMQ4t+0+\nIArDSFXqiT7w5dG3nMtdTjnH9k46Y4YXVsuIhCw71y4tF3hljKPFkccqz4TrS0UD\nPOWcNoLLjxUNQacloVzUNxCg4BdkB4zXlfxjuE+RAoGAR5GdA51lOqJ2g+SJW8s/\n5Au+8/RiaLLgrBLU4UvE1W3MmQKXfqgKcCtKWyNDhECMGWb4uc3APG96EmCxTOF4\nxiz0OoJxDGPPf9EVUbvicmV2MFpcAi10RB1DYAZZbem9WYnGeFg/JTsmFd7x4+Qf\n4f+4L7n9PLXe6Yx4SakRa9o=\n-----END PRIVATE KEY-----\n"
 
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
 
  // agent: new HttpsAgent({
  //   maxSockets: Infinity,
  //   cert: SERVER_CERTIFICATE,
  //   key : SERVER_CERTIFICATE_KEY,
  //   timeout : 0,
  //   freeSocketTimeout: 4500
  // }),
 
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