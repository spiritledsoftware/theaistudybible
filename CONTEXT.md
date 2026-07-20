# The AI Study Bible

The product context for reading, studying, and exploring scripture with personal study tools and AI-assisted guidance.

## Language

**Reader**:
A person using the study experience, whether anonymous or signed in.
_Avoid_: User, consumer

**Account**:
A Reader’s signed-in identity and persisted study data, preferences, authentication methods, and subscription relationship.
_Avoid_: Profile, login, user record

**AI Scripture Assistant**:
A scripture-grounded conversational experience that helps a reader explore biblical passages and theological questions. It is an AI study aid, not a believer or pastor; underlying model providers are not user-facing choices.
_Avoid_: Chat model, model catalog, AI provider

**Semantic Scripture Search**:
Search that finds conceptually related scripture passages rather than relying only on matching words. Relevance quality is part of the feature’s behavior even when exact result ordering can vary.
_Avoid_: Vector store, Vectorize search, similarity database

**Christian Tradition**:
A curated, broad family of Christian interpretation selected by a reader to frame disputed theological questions. It guides answers without visible labeling; a tradition-neutral reader instead receives a summary of major supported views.
_Avoid_: Model preference, denomination, custom prompt

**Assistant Preferences**:
A reader’s presentation preferences for the AI Scripture Assistant, such as tone, length, reading level, and study goals. They cannot change scripture-grounding, safety rules, or the selected Christian Tradition.
_Avoid_: Added AI Instructions, custom prompt, doctrinal instructions

**Scripture Grounding**:
The requirement that scripture quotations, theological claims, and source-dependent guidance be supported by retrieved evidence and citations. If the available evidence is insufficient, the Assistant says so rather than filling the gap from unsupported model knowledge.
_Avoid_: Model knowledge, citation when available

**Pro**:
The paid individual plan that provides higher cost-based usage limits for the AI Scripture Assistant, Semantic Scripture Search, and image generation without changing answer quality or Bible translation access.
_Avoid_: Advanced models, premium translations, Ministry

**Grounding Source**:
A rights-verified, administrator-approved scripture or tradition document whose retrieved content may support substantive Assistant claims. Its origin, version, rights basis, and tradition classification are recorded.
_Avoid_: Data source, vector document, arbitrary upload

**Pastoral Care**:
Compassionate spiritual support that encourages scripture, trusted people, church community, and appropriate professional or emergency help. It never presents the Assistant as clergy, medical care, mental-health care, or emergency response.
_Avoid_: Counseling, diagnosis, crisis service
