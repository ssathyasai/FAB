"""
Test Receipt Scanner Feature
Run: python test_scanner.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 50)
print("RECEIPT SCANNER - API KEY CHECK")
print("=" * 50)

# Check API keys
groq_key = os.getenv("GROQ_API_KEY", "")
gemini_key = os.getenv("GEMINI_API_KEY", "")
openai_key = os.getenv("OPENAI_API_KEY", "")

print(f"\n✅ GROQ API KEY: {'✅ Configured' if groq_key and len(groq_key) > 10 else '❌ Missing'}")
if groq_key:
    print(f"   Length: {len(groq_key)} chars")
    print(f"   Prefix: {groq_key[:10]}...")

print(f"\n✅ GEMINI API KEY: {'✅ Configured' if gemini_key and len(gemini_key) > 10 else '❌ Missing'}")
if gemini_key:
    print(f"   Length: {len(gemini_key)} chars")
    print(f"   Prefix: {gemini_key[:10]}...")
    if not gemini_key.startswith("AIza"):
        print("   ⚠️ WARNING: Should start with 'AIza'")

print(f"\n✅ OPENAI API KEY: {'✅ Configured' if openai_key and len(openai_key) > 10 else '❌ Missing'}")
if openai_key:
    print(f"   Length: {len(openai_key)} chars")
    print(f"   Prefix: {openai_key[:10]}...")

print("\n" + "=" * 50)
print("RECEIPT SCANNER STATUS")
print("=" * 50)

if groq_key or gemini_key or openai_key:
    print("\n✅ Scanner is READY!")
    print("\nProvider Priority:")
    if groq_key:
        print("   1. Groq (llama-3.2-11b-vision)")
    if gemini_key:
        print("   2. Gemini (gemini-2.0-flash-lite)")
    if openai_key:
        print("   3. OpenAI (gpt-4o-mini)")
    
    print("\n📝 How to Test:")
    print("   1. Start backend: uvicorn main:app --reload")
    print("   2. Go to: http://localhost:3000/bank")
    print("   3. Click 'Scan Receipt' button")
    print("   4. Upload a receipt image")
    print("   5. Should auto-fill amount, category, merchant")
else:
    print("\n❌ Scanner NOT working!")
    print("\n⚠️ Problem: NO API keys configured")
    print("\n🔧 Solution:")
    print("   1. Get Groq key: https://console.groq.com/")
    print("   2. Add to .env: GROQ_API_KEY=gsk_...")
    print("   3. Restart backend server")

print("\n" + "=" * 50)
