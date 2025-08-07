import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  collection,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Home page lists existing events and allows creation of a new event. Each
 * event represents a set list. When an event is created it writes a
 * document to the `events` collection with a name and an empty songs array.
 */
export default function Home() {
  const [name, setName] = useState('');
  const [events, setEvents] = useState([]);
  const router = useRouter();

  // Subscribe to real-time updates on the events collection.
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const evs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(evs);
    });
    return () => unsubscribe();
  }, []);

  // Create a new event and navigate to its page.
  //
  // Planning Center–style set lists maintain a reference list of song
  // identifiers rather than embedding full song objects on the event. When
  // creating a new event we initialise an empty `songIds` array. This
  // allows songs to be removed from a set without deleting them from the
  // master library.
  const createEvent = async () => {
    if (!name.trim()) return;
    // Create a new event document with a name and an empty array of song
    // identifiers. Additional metadata such as the event date can be added
    // later if desired.
    const docRef = await addDoc(collection(db, 'events'), {
      name: name.trim(),
      songIds: [],
    });
    setName('');
    router.push(`/event/${docRef.id}`);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Worship Setlist Manager</h1>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="New event name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button onClick={createEvent} style={{ padding: '0.5rem 1rem' }}>
          Create Event
        </button>
      </div>
      <h2>Your Events</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {events.map((ev) => (
          <li key={ev.id} style={{ marginBottom: '0.5rem' }}>
            <a href={`/event/${ev.id}`} style={{ color: '#0070f3', textDecoration: 'none' }}>
              {ev.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
