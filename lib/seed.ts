
'use server';

import { collection, doc, writeBatch } from "firebase/firestore";
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from "@/firebase/config";

// NOTE: This is a one-off script to seed the database.
// It is not part of the main application flow.
// You can run this by temporarily calling it from a page component.

function initializeServerSideFirebase() {
    if (getApps().some(app => app.name === 'server-seeder')) {
        return getApp('server-seeder');
    }
    // Initialize a new app with a unique name for server-side operations
    return initializeApp(firebaseConfig, 'server-seeder');
}


export async function seedDatabase() {
    console.log("Seeding database...");
    
    try {
        const serverApp = initializeServerSideFirebase();
        const firestore = getFirestore(serverApp);
        const batch = writeBatch(firestore);

        // NOTE: Replace these UIDs with actual user UIDs from your Firebase Authentication
        const user1UID = "REPLACE_WITH_USER_1_UID";
        const user2UID = "REPLACE_WITH_USER_2_UID";
        const user3UID = "REPLACE_WITH_USER_3_UID";

        if (user1UID.startsWith("REPLACE")) {
            const warningMessage = "Seeding failed: Please replace the placeholder UIDs in src/lib/seed.ts with actual user IDs from your Firebase project's Authentication tab.";
            console.warn(warningMessage);
            alert(warningMessage);
            return;
        }

        // 1. Create User Profiles
        const usersRef = collection(firestore, "users");
        const user1Data = { id: user1UID, firstName: "Alice", lastName: "Smith", email: "alice@example.com" };
        const user2Data = { id: user2UID, firstName: "Bob", lastName: "Johnson", email: "bob@example.com" };
        const user3Data = { id: user3UID, firstName: "Charlie", lastName: "Brown", email: "charlie@example.com" };

        batch.set(doc(usersRef, user1UID), user1Data);
        batch.set(doc(usersRef, user2UID), user2Data);
        batch.set(doc(usersRef, user3UID), user3Data);


        // 2. Create a Circle
        const circlesRef = collection(firestore, "circles");
        const circleId = "my-first-circle";
        const circleData = {
            id: circleId,
            name: "Family",
            ownerId: user1UID,
            memberIds: [user1UID, user2UID, user3UID],
        };
        batch.set(doc(circlesRef, circleId), circleData);

        // 3. Add some check-ins
        const user1CheckinsRef = collection(firestore, "users", user1UID, "checkIns");
        batch.set(doc(user1CheckinsRef), { userId: user1UID, timestamp: new Date() });

        const user2CheckinsRef = collection(firestore, "users", user2UID, "checkIns");
        batch.set(doc(user2CheckinsRef), { userId: user2UID, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }); // 2 days ago


        await batch.commit();
        console.log("Database seeded successfully!");
        alert("Database seeded successfully!");

    } catch (error) {
        console.error("Error seeding database:", error);
        alert(`An error occurred while seeding the database. Check the console for details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
