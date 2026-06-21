"use client";

/**
 * AssetAdvisor — embeds the original loginpage.html (AssetGPT UI) directly.
 * The original file is served as a static asset from /public/assetgpt.html
 * so its exact design, JS logic, and styles are preserved 100%.
 *
 * When the user submits the form, the page's own JS handles the offline
 * rule-based report. If a Gemini key is configured in our backend,
 * the iframe posts a message to trigger the API-enhanced version.
 */
export default function AssetAdvisor() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 200px)", minHeight: 600 }}>
      <iframe
        src="/assetgpt.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "1.5rem",
          background: "transparent",
        }}
        title="AssetGPT — AI Asset Opportunity Advisor"
      />
    </div>
  );
}
