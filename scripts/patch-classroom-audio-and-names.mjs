import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("app/classroom/[id]/page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Initial participant name: replace email with full_name or Learner
content = content.replace(
  `name: json.data.identity ? user.email?.split("@")[0] || "Learner" : "Learner",`,
  `name: user.user_metadata?.full_name || user.user_metadata?.name || "Learner",`
);

// 2. Load persistent classroom messages: pass session authorization header
const oldLoadMsgs = `        // Load persistent classroom messages & pinned presentation items
        try {
          const msgsRes = await fetch(\`/api/classroom/messages?classId=\${classId}\`);`;

const newLoadMsgs = `        // Load persistent classroom messages & pinned presentation items
        try {
          const msgsRes = await fetch(\`/api/classroom/messages?classId=\${encodeURIComponent(classId)}\`, {
            headers: {
              Authorization: \`Bearer \${session.access_token}\`,
            },
          });`;

content = content.replace(oldLoadMsgs, newLoadMsgs);

// 3. handleSendMessage: pass authorization header and safe sender name
const oldSendMsg = `    const payloadMsg = {
      classId,
      senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
      text: textToSend,
      type: "text" as const,
      isHost: isHostUser,
    };

    try {
      const res = await fetch("/api/classroom/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadMsg),
      });`;

const newSendMsg = `    const safeSender =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "Learner";

    const payloadMsg = {
      classId,
      senderName: safeSender,
      text: textToSend,
      type: "text" as const,
      isHost: isHostUser,
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = \`Bearer \${token}\`;

      const res = await fetch("/api/classroom/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(payloadMsg),
      });`;

content = content.replace(oldSendMsg, newSendMsg);

// 4. Voice recording onstop: convert to universal base64 data URL + upload with auth header
const oldVoiceUpload = `          let uploadedUrl = URL.createObjectURL(audioBlob);
          try {
            const uploadRes = await fetch("/api/classroom/upload", {
              method: "POST",
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (uploadRes.ok && uploadJson.url) {
              uploadedUrl = uploadJson.url;
            }
          } catch (e) {
            console.warn("Audio upload fallback:", e);
          }

          // 2. Persist message
          const payloadMsg = {
            classId,
            senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
            text: "🎙️ Voice Note",
            type: "audio" as const,
            mediaUrl: uploadedUrl,
            duration: Math.max(1, duration),
            isHost: classDetails?.tutorId === currentUser.id,
          };

          try {
            const postRes = await fetch("/api/classroom/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payloadMsg),
            });`;

const newVoiceUpload = `          // Convert audio blob to universal base64 so all devices/recipients can play it immediately
          const base64Data: string = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(audioBlob);
          });

          let uploadedUrl = base64Data;
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = \`Bearer \${token}\`;

            const uploadRes = await fetch("/api/classroom/upload", {
              method: "POST",
              headers,
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (uploadRes.ok && uploadJson.url) {
              uploadedUrl = uploadJson.url;
            }
          } catch (e) {
            console.warn("Audio upload fallback:", e);
          }

          const safeSender =
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            "Learner";

          // 2. Persist message with auth header
          const payloadMsg = {
            classId,
            senderName: safeSender,
            text: "🎙️ Voice Note",
            type: "audio" as const,
            mediaUrl: uploadedUrl,
            duration: Math.max(1, duration),
            isHost: classDetails?.tutorId === currentUser.id,
          };

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const postHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (token) postHeaders["Authorization"] = \`Bearer \${token}\`;

            const postRes = await fetch("/api/classroom/messages", {
              method: "POST",
              headers: postHeaders,
              body: JSON.stringify(payloadMsg),
            });`;

content = content.replace(oldVoiceUpload, newVoiceUpload);

// 5. togglePlayAudio: safe error handling & toast feedback
const oldTogglePlay = `  const togglePlayAudio = (msgId: string, url: string) => {
    if (currentlyPlayingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setCurrentlyPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => setCurrentlyPlayingAudioId(null);
      audio.onerror = () => setCurrentlyPlayingAudioId(null);
      audio.play().catch(() => setCurrentlyPlayingAudioId(null));
      setCurrentlyPlayingAudioId(msgId);
    }
  };`;

const newTogglePlay = `  const togglePlayAudio = (msgId: string, url: string) => {
    if (!url) {
      toast.error("Audio recording is not available.");
      return;
    }
    if (currentlyPlayingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setCurrentlyPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      try {
        const audio = new Audio(url);
        audioPlayerRef.current = audio;
        audio.onended = () => setCurrentlyPlayingAudioId(null);
        audio.onerror = (e) => {
          console.warn("Audio playback error:", e);
          setCurrentlyPlayingAudioId(null);
          toast.error("Could not play voice note. Format may not be supported by your device.");
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setCurrentlyPlayingAudioId(msgId);
            })
            .catch((err) => {
              console.warn("Autoplay / audio play rejected:", err);
              setCurrentlyPlayingAudioId(null);
              toast.info("Tap again to allow audio playback on your device.");
            });
        } else {
          setCurrentlyPlayingAudioId(msgId);
        }
      } catch (err) {
        console.error("Audio init failed:", err);
        toast.error("Unable to start audio player.");
      }
    }
  };`;

content = content.replace(oldTogglePlay, newTogglePlay);

// 6. Replace remaining user.email?.split("@")[0]
content = content.replace(
  `currentUser.user_metadata?.full_name ||\n                    currentUser?.email?.split("@")[0] ||\n                    "Learner"`,
  `currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "Learner"`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully patched classroom page audio, names and persistent chat!");
