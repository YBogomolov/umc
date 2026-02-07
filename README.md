# Universal Miniature Creator

> **Disclaimer:** This is a 100% vibe-coded project. If this is not your jam, feel free to ignore.

Universal Miniature Creator is a small project of mine. One of my hobbies is tabletop miniature wargames, and as a papercraft enthusiast, I find it rather difficult to find good representations of my characters. With Gemini 2.5 Nano Banana (_who on earth comes up with those stupid names?_), I got myself a nice tool to cover my specific needs. Now, with UMC, I am streamlining my experience.

This project is a "bring your own key" solution, meaning you can create a free tier Gemini key to use this app. There's little to see without a key, so the onboarding is rather minimalistic.

UMC allows you to create a 2D paper miniature ("standee") from a textual description. This tool generates frontal view, then, based on that, back view (so you don't have to roll with two front-facing views of your mini), and finally a base. You can add a mini to a collection, and finally you can download the whole collection or individual mini images.

**This is a FE-only project**. It uses IndexedDB to store your minis and collections between runs. Safari users — you know your limitations, if not — google them, please. Average size of one Gemini-generated 1024x1024 px file is roughly 2 MiBs, so do your math and keep an eye on the storage. You API key is stored in the `localStorage`, so it doesn't leave your machine in a sense that keys (or anything, really) are not sent to a server of mine of any kind.

The code and deployed website are provided "as is". All usage is up to your discretion.
