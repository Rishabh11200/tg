export const helpMsg =
  `__Hello__,` +
  "\nThanks for reaching **YARRS-GPT**" +
  "\n\nFeatures:" +
  "\n\n__1.__**!chat (__System message__) <your query>**: To chat with GPT-3" +
  "\n\n__2.__**!img or !image <your imagination>**: To Generate the image from your thinking" +
  "\n\n__3.__ **After sending the url**: To download __youtube__ video as audio or video." +
  "\nSend audio / video replying to **link**" +
  "\n\n__4.__**!help**: To get this message." +
  "\n\n```-> Note:``` You can use any one these character to command **__['!', '.', '_', '#']__**.";

export const ytMiniHelp =
  "Reply to youtube link: **Audio** / **Video**__?__👆🏻🤔💭";

  /**
   * 
   * @param {number} itemCount 
   * @returns {String}
   */
export const playlist = (itemCount) => {
  return (
    `Hey, Found youtube playlist with ${itemCount} items...` +
    `\nReply to the playlist link if you want to download whole playlist as an audio✨.` +
    `\n Example: ` +
    `\n1. audio 5 __(if you want to download first 5 items from playlist)__` +
    `\n2. audio __(only audio for all the items from playlist)__`
  );
};

export const chat = ["!chat", ".chat", "_chat", "#chat"];
export const help = ["!help", ".help", "_help", "#help"];
export const yt = ["!yt", ".yt", "_yt", "#yt"];
export const image = [
  "!img",
  ".img",
  "_img",
  "#img",
  "!image",
  "#image",
  ".image",
  "_image",
];
export const addUser = [">add"];
export const getAll = [">all"];
export const deleteUser = [">del"];
