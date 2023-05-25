import ffmpeg from "fluent-ffmpeg";
import ffmpegForVideo from "ffmpeg-static";
import fs from "fs";
import ytdl from "ytdl-core";
import {
  download,
  checkAndUnlink,
  generateRandomSixDigitNumber,
  sendFile,
} from "./utlis.js";
import cp from "child_process";
import { TelegramClient, client } from "telegram";
import ytpl from "ytpl";

/**
 *
 * @param {string} ytLink
 * @param {TelegramClient} client
 * @param {any} toChat
 * @param {boolean} isPlaylist
 * @param {number} indexOfPlaylist
 */
export const onAudio = async (
  ytLink,
  client,
  toChat,
  isPlaylist = false,
  indexOfPlaylist = 0
) => {
  const universalName = `${toChat}${generateRandomSixDigitNumber()}`;
  try {
    let thumbnailDownloaded = false;
    const info = await ytdl.getInfo(ytLink);
    const tempTitle = info?.videoDetails?.title.replace(/\s+/g, "_").trim();
    const regex = /[^a-zA-Z0-9_]/g;
    const title = isPlaylist
      ? `${indexOfPlaylist}_${tempTitle.replace(regex, "")}`
      : tempTitle.replace(regex, "");

    fs.writeFileSync(`./db/${universalName}.mp3`, "");
    fs.writeFileSync(`./db/${universalName}1.mp3`, "");

    const audioStream = ytdl(ytLink, {
      filter: "audioonly",
      format: "mp3",
      quality: "highest",
    });
    const metadata = {
      title:
        info?.videoDetails?.title?.replace(/\s+/g, "_").trim() ?? "Unknown",
      artist:
        info?.videoDetails?.author?.name?.replace(/\s+/g, "_").trim() ??
        "Unknown",
      year: info?.player_response?.microformat?.playerMicroformatRenderer?.publishDate?.substring(
        0,
        4
      ),
      genre: "Unknown",
    };
    const thumbnailurl =
      info?.player_response?.microformat?.playerMicroformatRenderer?.thumbnail
        .thumbnails[0].url;
    if (thumbnailurl) {
      fs.writeFileSync(`./db/${universalName}.jpg`, "");
      download(thumbnailurl, `./db/${universalName}.jpg`, function () {
        thumbnailDownloaded = true;
      });
    }
    const converting = await client.sendMessage(toChat, {
      message: "Converting...🎶🎵",
    });
    ffmpeg(audioStream)
      .audioBitrate(320)
      .toFormat("mp3")
      .saveToFile(`./db/${universalName}.mp3`)
      .on("end", async () => {
        if (thumbnailDownloaded) {
          ffmpeg()
            .input(`./db/${universalName}.mp3`)
            .input(`./db/${universalName}.jpg`)
            .outputOptions([
              "-map 0:0",
              "-map 1:0",
              "-c copy",
              "-id3v2_version 3",
              `-metadata:s:v title=\"Album_cover\"`,
              `-metadata:s:v comment=\"Cover_(front)\"`,
              `-metadata`,
              `title=${metadata.title}`,
              `-metadata`,
              `artist=${metadata.artist}`,
              `-metadata`,
              `date=${metadata.year}`,
              `-metadata`,
              `genre=${metadata.genre}`,
            ])
            .output(`./db/${universalName}1.mp3`)
            .on("end", async () => {
              fs.renameSync(`./db/${universalName}1.mp3`, `./db/${title}.mp3`);
              await sendFile(
                client,
                toChat,
                `./db/${title}.mp3`,
                converting.id
              ).then(async (sent) => {
                cleanupFiles(title);
              });
            })
            .on("error", function (err, stdout, stderr) {
              console.error("An error occurred: " + err.message);
              console.error("FFmpeg stdout: " + stdout);
              console.error("FFmpeg stderr: " + stderr);
              cleanupFiles(title);
            })
            .run();
        } else {
          ffmpeg()
            .input(`./db/${universalName}.mp3`)
            .input(`./db/${universalName}.jpg`)
            .outputOptions([
              "-c copy",
              "-id3v2_version 3",
              `-metadata`,
              `title=${metadata.title}`,
              `-metadata`,
              `artist=${metadata.artist}`,
              `-metadata`,
              `date=${metadata.year}`,
              `-metadata`,
              `genre=${metadata.genre}`,
            ])
            .output(`./db/${universalName}1.mp3`)
            .on("end", async () => {
              fs.renameSync(`./db/${universalName}1.mp3`, `./db/${title}.mp3`);
              await sendFile(
                client,
                toChat,
                `./db/${title}.mp3`,
                converting.id
              ).then(async (sent) => {
                cleanupFiles(title);
              });
            })
            .on("error", function (err, stdout, stderr) {
              console.error("An error occurred: " + err.message);
              console.error("FFmpeg stdout: " + stdout);
              console.error("FFmpeg stderr: " + stderr);
              cleanupFiles(title);
            })
            .run();
        }
      })
      .on("error", (error) => {
        cleanupFiles();
        console.log("ffmpeg", error);
      });
  } catch (error) {
    cleanupFiles();
    console.log("Some error YTAUDIO: ", error);
  }
  function cleanupFiles(title) {
    checkAndUnlink(`./db/${universalName}.mp3`);
    checkAndUnlink(`./db/${universalName}1.mp3`);
    checkAndUnlink(`./db/${universalName}.jpg`);
    checkAndUnlink(`./db/${title}.mp3`);
  }
};

/**
 *
 * @param {string} ytLink
 * @param {TelegramClient} client
 * @param {any} toChat
 */
export const onVideo = async (ytLink, client, toChat) => {
  const universalName = `${toChat}${generateRandomSixDigitNumber()}`;
  try {
    const tracker = {
      start: Date.now(),
      audio: { downloaded: 0, total: Infinity },
      video: { downloaded: 0, total: Infinity },
      merged: { frame: 0, speed: "0x", fps: 0 },
    };

    const audio = ytdl(ytLink, { quality: "highestaudio" }).on(
      "progress",
      (_, downloaded, total) => {
        tracker.audio = { downloaded, total };
      }
    );
    const video = ytdl(ytLink, { quality: "highestvideo" }).on(
      "progress",
      (_, downloaded, total) => {
        tracker.video = { downloaded, total };
      }
    );
    let converting = await client.sendMessage(toChat, {
      message: "Converting...📽️",
    });
    const ffmpegProcess = cp
      .spawn(
        ffmpegForVideo,
        [
          "-loglevel",
          "8",
          "-hide_banner",
          "-progress",
          "pipe:3",
          "-i",
          "pipe:4",
          "-i",
          "pipe:5",
          "-map",
          "0:a",
          "-map",
          "1:v",
          "-c:v",
          "copy",
          `./db/${universalName}.mkv`,
        ],
        {
          windowsHide: true,
          stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
        }
      )
      .on("error", (error) => {
        console.log("First", error);
      });

    ffmpegProcess.on("close", () => {
      const convertProcess = cp
        .spawn(ffmpegForVideo, [
          "-i",
          `./db/${universalName}.mkv`,
          "-c",
          "copy",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          `./db/${universalName}.mp4`,
        ])
        .on("error", (error) => {
          console.log("Error in mkv to mp4", error);
        });
      convertProcess.on("exit", async () => {
        const info = await ytdl.getInfo(ytLink);
        let tempTitle = info?.videoDetails?.title.replace(/\s+/g, "_").trim();
        const regex = /[^a-zA-Z0-9_]/g;
        let title = tempTitle.replace(regex, "");
        const tracks =
          info?.player_response?.captions?.playerCaptionsTracklistRenderer
            ?.captionTracks;
        const format = "vtt";
        if (tracks && tracks.length) {
          const track = tracks.find((t) => t.languageCode === "en");
          if (track) {
            const output = `${info.videoDetails.title}.${track.languageCode}.${format}`;
            fs.writeFileSync(`./db/${universalName}.vtt`, "");
            fs.writeFileSync(`./db/${universalName}1.mp4`, "");
            download(
              `${track.baseUrl}&fmt=${format}`,
              `./db/${universalName}.vtt`,
              function () {
                ffmpeg(`./db/${universalName}.mp4`)
                  .inputFormat("mp4")
                  .input(`./db/${universalName}.vtt`)
                  .outputOptions(
                    "-c:v",
                    "copy",
                    "-c:a",
                    "copy",
                    "-c:s",
                    "mov_text",
                    "-metadata:s:s:0",
                    "language=eng",
                    "-metadata:s:s:0",
                    'title="English"',
                    "-disposition:s:0",
                    "forced"
                  )
                  .output(`./db/${universalName}1.mp4`)
                  .on("error", (error, stdout, stderr) => {
                    console.error(
                      `Failed to merge video and subtitles: ${error}`
                    );
                  })
                  .on("end", async () => {
                    fs.renameSync(
                      `./db/${universalName}1.mp4`,
                      `./db/${title}.mp4`
                    );
                    await sendFile(client, toChat, `./db/${title}.mp4`).then(
                      async (sent) => {
                        await client.deleteMessages(toChat, [converting.id], {
                          revoke: true,
                        });
                        checkAndUnlink(`./db/${universalName}.mp4`);
                        checkAndUnlink(`./db/${universalName}.mkv`);
                        checkAndUnlink(`./db/${title}.mp4`);
                        checkAndUnlink(`./db/${universalName}.vtt`);
                      }
                    );
                  })
                  .run();
              }
            );
          } else {
            fs.renameSync(`./db/${universalName}.mp4`, `./db/${title}.mp4`);
            await sendFile(client, toChat, `./db/${title}.mp4`).then(
              async (sent) => {
                await client.deleteMessages(toChat, [converting.id], {
                  revoke: true,
                });
                checkAndUnlink(`./db/${universalName}.mp4`);
                checkAndUnlink(`./db/${universalName}.mkv`);
                checkAndUnlink(`./db/${title}.mp4`);
                checkAndUnlink(`./db/${universalName}.vtt`);
              }
            );
          }
        } else {
          fs.renameSync(`./db/${universalName}.mp4`, `./db/${title}.mp4`);
          await sendFile(client, toChat, `./db/${title}.mp4`).then(
            async (sent) => {
              await client.deleteMessages(toChat, [converting.id], {
                revoke: true,
              });
              checkAndUnlink(`./db/${universalName}.mp4`);
              checkAndUnlink(`./db/${universalName}.mkv`);
              checkAndUnlink(`./db/${title}.mp4`);
              checkAndUnlink(`./db/${universalName}.vtt`);
            }
          );
        }
      });
    });

    ffmpegProcess.stdio[3].on("data", (chunk) => {
      const lines = chunk.toString().trim().split("\n");
      const args = {};
      for (const l of lines) {
        const [key, value] = l.split("=");
        args[key.trim()] = value.trim();
      }
      tracker.merged = args;
    });

    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);
  } catch (error) {
    console.log("YT video: ", error);
  }
};

/**
 *
 * @param {string} ytPLLink
 * @param {TelegramClient} client
 * @param {any} toChat
 * @param {number} itemsToDownload
 */
export const onPlaylist = async (ytPLLink, client, toChat, itemsToDownload) => {
  /**  @type {ytpl.Result} */
  const playlist = await ytpl(ytPLLink);
  let count = 1,
    promises = [];
  for (let i = 0; i < playlist.items.length; i++) {
    const singleVideo = playlist.items[i];
    const ytLink = singleVideo.shortUrl;
    if (itemsToDownload !== 0 && count > itemsToDownload) {
      break;
    }
    promises.push(onAudio(ytLink, client, toChat, true, i + 1));
    count++;
  }
  await Promise.all(promises);
};
