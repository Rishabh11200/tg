import dot from "dotenv";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import moment from "moment/moment.js";
import { deleteExpiredObjects } from "./src/openai.js";
import { onMyMsg } from "./src/admin.js";
import { allUsers } from "./src/users.js";
import { onMessage } from "./src/onMessage.js";
// import input  from "input";

dot.config();

const apiId = parseInt(process.env.apiid);
const apiHash = process.env.apihash;
const stringSession = new StringSession(process.env.sessionString); // fill this later with the value from session.save()

process.on("uncaughtException", async (reason) => console.log(reason));
process.on("unhandledRejection", async (reason) => console.log(reason));

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  console.log("You should now be connected.");

  await client.sendMessage("me", {
    message: `Started at ${moment().format("ddd DD-MMM-YYYY, hh:mm:ss A")}`,
  });

  client.addEventHandler(async (update) => {
    onMessage(update, client);
  }, new NewMessage({ incoming: true, fromUsers: allUsers }));

  client.addEventHandler(async (update) => {
    onMyMsg(update, client);
  }, new NewMessage({ outgoing: true, fromUsers: ["me"] }));

  //   await client.start({
  //     phoneNumber: async () => await input.text("Please enter your number: "),
  //     password: async () => await input.text("Please enter your password: "),
  //     phoneCode: async () =>
  //       await input.text("Please enter the code you received: "),
  //     onError: (err) => console.log(err),
  //   });
  //   console.log(client.session.save()); // Save this string to avoid logging in again
})();

setInterval(deleteExpiredObjects, 60000); // 1 minute
