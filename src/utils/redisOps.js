import { client } from "../db/redis.db.js";
import {v4 as uuidv4} from "uuid"

async function setData(folder, key, value, option, ttl) {
  //set data in a folder
  client.json
    .set(`people:${folder}:${key}`, "$", value, option)
    .then((data) => {
      console.log(data);
      //set TTL for auto remove if needed
      if (ttl > 0) {
        client.expire(`people:${folder}:${key}`, ttl).catch((err) => {
          console.log(err);
          return null;
        });
      }
      return data;
    })
    .catch((err) => {
      console.log(err);
      return null;
    });
}

async function getData(folder, key) {
  return await client.json.get(`people:${folder}:${key}`);
}

async function setNotification(message, link, userId) {
  // get current date
  const today = new Date().toLocaleString();

  // unique value for each notification
  const uniquekey = uuidv4()

  // key
  const key = `people:notification:${userId}`;

  // data to be saved
  const data = {
    link: link,
    message: message,
    date: today,
    isOpen: false,
  };

  // I am saving notifications in an array. For each user, there is an array with notifications.

  // check if the array of the user is already existed
  const existedUser = await client.json.get(key, "$");
  // if there is no array with the name of the corresponding user, then make it
  if (!existedUser) {
    await client.json
      .set(key, "$", [])
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return null;
      });
  }

  // array has been created, now push the data to the array
  await client.json
    .arrAppend(key, "$", data)
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.log(err);
      return null;
    });
}

async function getNotification(userId) {
  // get all notifications
  return await client.json.get(`people:notification:${userId}`);
}

async function updateNotificationStatus(userId, data, index) {
  if (data?.isOpen === undefined) return null;

  // key
  const key = `people:notification:${userId}`;

  data["isOpen"] = true;
  // redis json feature to update a perticular arr elem
  const path = `$[${index}]`;

  await client.json
    .set(key, path, data)
    .then((data) => {
      return data;
    })
    .catch((err) => {
      return null;
    });
}

export { setData, getData, setNotification, getNotification, updateNotificationStatus };
