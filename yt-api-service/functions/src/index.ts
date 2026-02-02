import * as functions from "firebase-functions/v1";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {UserRecord} from "firebase-admin/auth";
import {Storage} from "@google-cloud/storage";

initializeApp();

const firestore = getFirestore();
const storage = new Storage();

const RAW_BUCKET = "ytclone-abhi-raw-videos";
// const PROCESSED_BUCKET = "ytclone-abhi-processed-videos";

/**
 * Auth trigger → create user doc
 */
export const createUser = functions.auth.user().onCreate(
  async (user: UserRecord) => {
    const userInfo = {
      uid: user.uid,
      email: user.email ?? null,
      photoUrl: user.photoURL ?? null,
    };

    await firestore.collection("users").doc(user.uid).set(userInfo);
  }
);

/**
 * Callable → generate signed upload URL
 */
export const generateUploadUrl = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called while authenticated."
      );
    }

    if (!data?.fileExtension) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "fileExtension is required"
      );
    }

    const uid = context.auth.uid;
    const bucket = storage.bucket(RAW_BUCKET);

    const fileName = `${uid}-${Date.now()}.${data.fileExtension}`;

    const [url] = await bucket.file(fileName).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "application/octet-stream",
    });

    return {url, fileName};
  }
);
