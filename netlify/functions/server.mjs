import vinextWorker from "../../dist/server/index.js";

export default async function handler(request) {
  return vinextWorker.fetch(request, {}, undefined);
}

