import Head from 'next/head';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>iCord</title>
        <meta name="description" content="Discord-like web app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to iCord
        </h1>

        <div className={styles.chatContainer}>
          <MessageList />
          <MessageInput />
        </div>
      </main>
    </div>
  );
}
