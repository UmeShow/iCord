import Head from 'next/head';
import Image from 'next/image';
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

      <header className={styles.header}>
        <Image src="/icordlogo.png" alt="iCord Logo" width={120} height={40} />
      </header>

      <main className={styles.main}>
        <div className={styles.chatContainer}>
          <MessageList />
          <MessageInput />
        </div>
      </main>
    </div>
  );
}
