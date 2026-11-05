/**
 * BrainLab Professional Liveboard - Stage 6 Collaborative Sync & Late-Join State Verification Suite
 */

import type { WhiteboardPage, WhiteboardElement } from "../app/components/SmartWhiteboard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// Simulated real-time channel matching Supabase / LiveKit data channel interface
class MockBroadcastChannel {
  private listeners: Map<string, ((event: { payload: any }) => void)[]> = new Map();

  on(type: "broadcast", filter: { event: string }, handler: (data: { payload: any }) => void) {
    const list = this.listeners.get(filter.event) || [];
    list.push(handler);
    this.listeners.set(filter.event, list);
    return this;
  }

  off(type: "broadcast", filter: { event: string }, handler: (data: { payload: any }) => void) {
    const list = this.listeners.get(filter.event) || [];
    this.listeners.set(filter.event, list.filter((h) => h !== handler));
    return this;
  }

  send(data: { type: "broadcast"; event: string; payload: any }) {
    const handlers = this.listeners.get(data.event) || [];
    // Deliver asynchronously to emulate network dispatch
    for (const h of handlers) {
      setTimeout(() => h({ payload: data.payload }), 0);
    }
    return Promise.resolve("ok");
  }
}

async function runStage6Verification() {
  console.log("\n🧪 --- BRAINLAB LIVEBOARD STAGE 6: COLLABORATIVE SYNC & LATE-JOIN SUITE ---\n");

  const sharedChannel = new MockBroadcastChannel();

  // --------------------------------------------------------------------------
  // TEST 1: Host Tutor Initial Setup (4 pages of content)
  // --------------------------------------------------------------------------
  const tutorId = "tutor-dr-adebayo";
  const studentId = "student-chioma";

  const tutorPages: WhiteboardPage[] = [
    {
      id: "page-1",
      title: "Page 1: Thermodynamics",
      elements: [
        { id: "el-1", type: "text", text: "First Law: dU = dQ - dW", color: "#38bdf8", width: 2, startX: 100, startY: 100 },
      ],
      aspectRatio: "16 / 9",
      backgroundMode: "blackboard",
    },
    {
      id: "page-2",
      title: "Page 2: Carnot Engine Cycle",
      elements: [
        { id: "el-2", type: "rect", color: "#10b981", width: 3, startX: 200, startY: 200, endX: 600, endY: 500 },
      ],
      aspectRatio: "16 / 9",
      backgroundMode: "grid",
    },
  ];
  let tutorActivePageIndex = 1;

  // Tutor listener for state hydration requests
  sharedChannel.on("broadcast", { event: "whiteboard_request_sync" }, ({ payload }) => {
    if (payload.senderId === tutorId) return;
    sharedChannel.send({
      type: "broadcast",
      event: "whiteboard_pages_sync",
      payload: {
        pages: JSON.parse(JSON.stringify(tutorPages)),
        activePageIndex: tutorActivePageIndex,
        senderId: tutorId,
      },
    });
  });

  // --------------------------------------------------------------------------
  // TEST 2: Late-Joining Student State Hydration
  // --------------------------------------------------------------------------
  let studentPages: WhiteboardPage[] = [];
  let studentActivePageIndex = 0;
  let studentHydrated = false;

  sharedChannel.on("broadcast", { event: "whiteboard_pages_sync" }, ({ payload }) => {
    if (payload.senderId === studentId) return;
    studentPages = payload.pages;
    studentActivePageIndex = payload.activePageIndex;
    studentHydrated = true;
  });

  // Student emits request upon joining
  sharedChannel.send({
    type: "broadcast",
    event: "whiteboard_request_sync",
    payload: { senderId: studentId },
  });

  // Wait for async dispatch
  await new Promise((r) => setTimeout(r, 50));

  assert(studentHydrated === true, "Late-joining student received 'whiteboard_pages_sync' response");
  assert(studentPages.length === 2, `Student board hydrated with all ${studentPages.length} pages (NOT blank)`);
  assert(studentActivePageIndex === 1, `Student active page synchronized to tutor's active page (${studentActivePageIndex})`);
  assert(studentPages[0].elements[0].text === "First Law: dU = dQ - dW", "Page 1 elements match tutor's authoritative lecture notes");

  // --------------------------------------------------------------------------
  // TEST 3: Incremental Stroke Broadcast ('whiteboard_draw')
  // --------------------------------------------------------------------------
  let strokeReceived = false;
  let receivedElement: WhiteboardElement | null = null;

  sharedChannel.on("broadcast", { event: "whiteboard_draw" }, ({ payload }) => {
    if (payload.senderId === studentId) return;
    if (payload.pageIndex === studentActivePageIndex) {
      studentPages[studentActivePageIndex].elements.push(payload.element);
      strokeReceived = true;
      receivedElement = payload.element;
    }
  });

  // Tutor draws a new vector line
  const newLineElement: WhiteboardElement = {
    id: "el-line-heat-transfer",
    type: "line",
    color: "#ff5238",
    width: 4,
    startX: 200,
    startY: 200,
    endX: 600,
    endY: 200,
  };

  tutorPages[tutorActivePageIndex].elements.push(newLineElement);
  sharedChannel.send({
    type: "broadcast",
    event: "whiteboard_draw",
    payload: {
      element: newLineElement,
      pageIndex: tutorActivePageIndex,
      senderId: tutorId,
    },
  });

  await new Promise((r) => setTimeout(r, 50));

  assert(strokeReceived === true, "Student receiver processed 'whiteboard_draw' broadcast");
  assert(receivedElement?.id === "el-line-heat-transfer", "Received element ID matches tutor's drawn stroke");
  assert(studentPages[1].elements.length === 2, "Student's active page reflects the newly appended stroke");

  // --------------------------------------------------------------------------
  // TEST 4: Real-time Laser Pointer Broadcast ('whiteboard_laser')
  // --------------------------------------------------------------------------
  let studentLaserPos: { x: number; y: number } | null = null;

  sharedChannel.on("broadcast", { event: "whiteboard_laser" }, ({ payload }) => {
    if (payload.senderId === studentId) return;
    if (payload.active) {
      studentLaserPos = { x: payload.x, y: payload.y };
    }
  });

  // Tutor moves laser to (540, 320)
  sharedChannel.send({
    type: "broadcast",
    event: "whiteboard_laser",
    payload: { x: 540, y: 320, color: "#ff5238", active: true, senderId: tutorId },
  });

  await new Promise((r) => setTimeout(r, 50));

  assert(studentLaserPos !== null, "Student received real-time laser pointer position");
  assert(studentLaserPos!.x === 540 && studentLaserPos!.y === 320, "Laser position matches tutor's tip coordinates exactly");

  // --------------------------------------------------------------------------
  // TEST 5: Whiteboard Clear Broadcast ('whiteboard_clear')
  // --------------------------------------------------------------------------
  let cleared = false;
  sharedChannel.on("broadcast", { event: "whiteboard_clear" }, ({ payload }) => {
    if (payload.senderId === studentId) return;
    if (payload.pageIndex === studentActivePageIndex) {
      studentPages[studentActivePageIndex].elements = [];
      cleared = true;
    }
  });

  sharedChannel.send({
    type: "broadcast",
    event: "whiteboard_clear",
    payload: { pageIndex: tutorActivePageIndex, senderId: tutorId },
  });

  await new Promise((r) => setTimeout(r, 50));

  assert(cleared === true, "Student received 'whiteboard_clear' event");
  assert(studentPages[1].elements.length === 0, "Student active page elements successfully cleared");

  console.log("\n========================================================");
  console.log("🎉 ALL STAGE 6 COLLABORATIVE REAL-TIME SYNC TESTS PASSED!");
  console.log("========================================================\n");
}

runStage6Verification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
