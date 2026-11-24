import React from "react";
import ChatBox from "../components/ChatBox";

export default function FitnessChat() {
  return (
    <div className="flex h-[calc(100dvh-4.5rem)] w-full min-w-0 flex-1 flex-col items-center justify-center p-1.5 sm:p-2.5 md:p-3">
      <div className="relative flex h-full w-full max-w-5xl min-w-0 flex-1 flex-col overflow-hidden rounded-2xl  bg-card/60 shadow-2xl">
        <ChatBox embedded />
      </div>
    </div>
  );
}
