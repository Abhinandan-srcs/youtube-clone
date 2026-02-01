import * as functions from "firebase-functions/v1";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {UserRecord} from "firebase-admin/auth";

initializeApp();
const firestore = getFirestore();

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
