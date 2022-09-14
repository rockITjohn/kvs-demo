const AWS = require("aws-sdk");

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  const { StartFragmentNumber, StartTimestamp, StreamARN } =
    event.Details.ContactData.MediaStreams.Customer.Audio;
  let bucket = "jb-kvs-streaming-testing";
  let key = "streams/latest.raw";
  let region = "us-east-1";

  const kinesisClient = new AWS.KinesisVideo({ region });

  try {
    // kinesis client - getDataEndpoint for HLS Streaming Session
    let endpointParams = {
      StreamARN: StreamARN,
      APIName: "GET_HLS_STREAMING_SESSION_URL",
    };
    let endpointResults = await kinesisClient
      .getDataEndpoint(endpointParams)
      .promise();
    let endpoint = endpointResults["DataEndpoint"];
    console.log("Endpoint", endpoint);

    try {
      // kinesis video archived media client
      let kinesisMediaClient = new AWS.KinesisVideoArchivedMedia({
        region,
        endpoint,
      });

      // Make request for HLS Streaming Session Url in "LIVE_REPLAY" mode
      let hlsParams = {
        StreamARN: StreamARN,
        ContainerFormat: "FRAGMENTED_MP4",
        DiscontinuityMode: "ON_DISCONTINUITY",
        DisplayFragmentTimestamp: "ALWAYS",
        Expires: 300, //default
        HLSFragmentSelector: {
          FragmentSelectorType: "PRODUCER_TIMESTAMP", // required if PlaybackMode = "LIVE_REPLAY"
          TimestampRange: {
            // "EndTimestamp": number, // optional if PlaybackMode = "LIVE_REPLAY"
            StartTimestamp: parseFloat(StartTimestamp), // required if PlaybackMode = "LIVE_REPLAY"
          },
        },
        MaxMediaPlaylistFragmentResults: 5, // default is 5 for PlaybackMode = "LIVE_REPLAY"
        PlaybackMode: "LIVE_REPLAY",
      };

      let HLSUrl = await kinesisMediaClient
        .getHLSStreamingSessionURL(hlsParams)
        .promise();

      console.log("HLS Url", HLSUrl);
    } catch (error) {
      console.log("Error making getHLSStreamingSessionURL call", error);
    }
  } catch (error) {
    console.log("Error", error);
  }
};
