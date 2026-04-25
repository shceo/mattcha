from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class StatItem(BaseModel):
    value: str
    label: str
    hint: str


class FaqItem(BaseModel):
    q: str
    a: str


class LandingStats(BaseModel):
    kicker: str
    title: str
    items: list[StatItem]


class LandingFaq(BaseModel):
    kicker: str
    title: str
    items: list[FaqItem]


class LandingManifesto(BaseModel):
    kicker: str
    title: str
    body: str
    signature: str


class LandingFinalCta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    kicker: str
    title: str
    subtitle: str
    button: str
    kicker_authed: str = Field(alias="kickerAuthed")
    title_authed: str = Field(alias="titleAuthed")
    subtitle_authed: str = Field(alias="subtitleAuthed")
    button_authed: str = Field(alias="buttonAuthed")


class LandingFooter(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tagline: str
    for_: str = Field(alias="for")
    users: str
    venues: str
    venues_url: str = Field(default="", alias="venuesUrl")
    partners_email: str = Field(default="", alias="partnersEmail")
    copyright: str


class LandingContent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    kicker: str
    title: str
    subtitle: str
    cta_primary: str = Field(alias="ctaPrimary")
    cta_primary_authed: str = Field(alias="ctaPrimaryAuthed")
    cta_secondary: str = Field(alias="ctaSecondary")
    stats: LandingStats
    steps_kicker: str = Field(alias="stepsKicker")
    steps_title: str = Field(alias="stepsTitle")
    feature1_title: str = Field(alias="feature1Title")
    feature1_body: str = Field(alias="feature1Body")
    feature2_title: str = Field(alias="feature2Title")
    feature2_body: str = Field(alias="feature2Body")
    feature3_title: str = Field(alias="feature3Title")
    feature3_body: str = Field(alias="feature3Body")
    manifesto: LandingManifesto
    faq: LandingFaq
    final_cta: LandingFinalCta = Field(alias="finalCta")
    footer: LandingFooter


def landing_dump(content: LandingContent) -> dict:
    return content.model_dump(by_alias=True)
