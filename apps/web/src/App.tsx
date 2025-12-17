import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

interface Job {
  id: string;
  status: string;
  payload: unknown;
  result: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]);

  async function loadJobs() {
    if (!user) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function createJob() {
    if (!user) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payload: { message: 'Hello from the web app!' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Job created: ${data.job.id}`);
        loadJobs();
      } else {
        const error = await response.json();
        alert(`Failed to create job: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to create job');
      console.error(error);
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
        <h1>__PROJECT_NAME__</h1>
        <h2>Sign In</h2>
        <form onSubmit={handleSignIn} style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            Sign In
          </button>
        </form>
        <button onClick={handleSignUp} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>__PROJECT_NAME__</h1>
      <div style={{ marginBottom: '2rem' }}>
        <p>Welcome, {user.email}!</p>
        <button onClick={handleSignOut} style={{ padding: '0.5rem 1rem' }}>
          Sign Out
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Jobs</h2>
        <button onClick={createJob} style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          Create Job
        </button>
        <button
          onClick={loadJobs}
          style={{ padding: '0.5rem 1rem', marginBottom: '1rem', marginLeft: '0.5rem' }}
        >
          Refresh
        </button>

        {jobs.length === 0 ? (
          <p>No jobs yet. Create one to get started!</p>
        ) : (
          <div>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: '1px solid #ccc',
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: '4px',
                }}
              >
                <p>
                  <strong>ID:</strong> {job.id}
                </p>
                <p>
                  <strong>Status:</strong> {job.status}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(job.created_at).toLocaleString()}
                </p>
                {job.result != null && (
                  <p>
                    <strong>Result:</strong> {JSON.stringify(job.result)}
                  </p>
                )}
                {job.error && (
                  <p style={{ color: 'red' }}>
                    <strong>Error:</strong> {job.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
