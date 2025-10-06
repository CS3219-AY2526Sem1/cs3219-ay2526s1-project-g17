import mongoose from "mongoose";

/**
 * @param {mongoose.Model} model
 * @param {Array} [pipeline=[]]
 * @param {number} [timeInMs=6000]
 */
export async function monitorListingUsingEventTransmitter(
  model,
  timeInMs = 6000,
  pipeline = []
) {
  const options = { fullDocument: "updateLookup" };
  const changeStream = model.watch(pipeline, options);

  changeStream.on("change", (next) => {
    console.log(next);
  });

  await closeChangeStream(timeInMs, changeStream);
}

function closeChangeStream(timeInMs = 6000, changeStream) {
  return new Promise(() =>
    setTimeout(() => {
      console.log("Close change stream");
      changeStream.close();
      resolve();
    }, timeInMs)
  );
}
