import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, 'events'));
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventList);
    };
    fetchEvents();
  }, []);

  const createEvent = async (e) => {
    e.preventDefault();
    if (!name) return;
    const docRef = await addDoc(collection(db, 'events'), { name, createdAt: Date.now() });
    setName('');
    router.push(`/event/${docRef.id}`);
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Worship Team Events</h1>
      <form onSubmit={createEvent}>
        <input
          type="text"
          placeholder="Event name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem' }}>Create Event</button>
      </form>
      <h2>Existing Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <a href={`/event/${event.id}`}>{event.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
