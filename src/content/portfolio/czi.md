---
title: "Chan Zuckerberg Initiative"
client: "CZI"
team: "Bravo Cohort, CZI Imaging"
role: "Sr. Content Designer"
website: "https://chanzuckerberg.github.io/napari-segmentation-workshop/intro.html"
heroImage: "/images/portfolio/hero-czi.png"
parallaxImage: "/images/portfolio/czi-hero-napari.gif"
tagline: ""
summary: "At CZI, I co-led the \"Bravo Cohort\" to design a learning platform and training materials for biology PhDs and imaging scientists."
duration: "2021 – 2022 (8 months)"
order: 2
galleries:
  - id: "napari-ecosystem"
    trigger: "mural-thumb.png"
    images:
      - src: "/images/portfolio/Mural.png"
        caption: "Our 2nd co-design workshop on Mural, facilitated over Zoom with 7 participating imaging scientists."
      - src: "/images/portfolio/IS-audit.png"
        caption: "Summary of our imaging scientists' audit findings, synthesized with my own audit of the napari ecosystem."
      - src: "/images/portfolio/bravo-cohort.png"
        caption: "My brilliant teammates, including my fellow co-lead, Dannielle McCarthy (application scientist)."
  - id: "cellpose-lesson"
    trigger: "cellpose.jpg"
    images:
      - src: "/images/portfolio/cellpose.jpg"
        caption: "An example of lesson from our MVP on using the Cellpose plugin for cell segmentation."
      - src: "/images/portfolio/what-is-napari.png"
        caption: "An explanation of napari and its applications, intended for research biologists new to the tool."
      - src: "/images/portfolio/PartSeg.png"
        caption: "An example of a Jupyter book lesson on using the PartSeg plugin for cell segmentation."
  - id: "setup-tutorial"
    trigger: "setup-tutorial.jpg"
    images:
      - src: "/images/portfolio/setup-tutorial.jpg"
        caption: "An early manifest of the 'Setup Tutorial' page template."
      - src: "/images/portfolio/pro-proto.png"
        caption: "Converting one of our manifests into a Sitecore prototype."
      - src: "/images/portfolio/Hardware.jpg"
        caption: "An early manifest of the 'Hardware' page template."
---

## Challenge

As part of its philanthropic charter, Chan Zuckerberg Initiative was supporting the development of an open-source, Python-based image analysis tool called napari. Although it was free and lightweight on most computers, napari lacked the web presence and robust documentation it needed to gain wider adoption within the global scientific community.

CZI assembled a "Bravo Cohort" headed by myself and an application scientist to scope out and **build an onboarding platform for napari within 6 months**.

## Task

Hired as a Sr. Content Designer by CZI, my responsibilities also included those of a project manager, and later an instructional designer:

- Ingest hundreds of pages of UX research on napari, and establish a full 6-month project plan, with milestones and tentative deadlines.
- Audit the existing napari.org and napari-hub.org, and support 8 volunteer research scientists to conduct their own audits in tandem.
- Host multiple co-design workshops with research scientists, and synthesize these findings into a formal proposal for our project MVP.
- Design and build an iterative wiki-like onboarding platform for "non-coder" research biologists interested in adopting the napari tool.

As co-lead of the "Bravo Cohort", I plugged into the CZI Slack, partook in daily and weekly stand-ups, and bi-monthly napari community meetings. I acted as a mediator between our staff UX researcher, two application scientists, a product manager, and SWE on my team.

![Mural board from co-design workshop](/images/portfolio/mural-thumb.png)

## Action

After vetting my 6-month project plan, I met with staff ML engineers at CZI to gain basic literacy in Python, install and use napari myself.

- While performing an audit of the napari sites and documentation, I added Issues/PRs on their GitHub to correct gaps in content for new users.
- I created expansive Mural boards intended to capture the expertise of our volunteer research scientists during our 2+ hour co-design workshops.
- I conducted competitive research of 12 other learning platforms (e.g. Data Camp and Kaggle) to analyze how they constructed UIs and curricula.
- We selected Jupyter Book as the ideal host for our project MVP, because of its transparency (hosted on GitHub) and ability to be iterated upon.

Building upon our co-design workshops, we assigned individual lessons from a larger "napari cell segmentation" course to our 8 volunteer research scientists. I forked a Jupyter Book template, modified it using Markdown, HTML and CSS, and acted as copy editor of all submitted lesson drafts.

![Cell segmentation in napari](/images/portfolio/cellpose.jpg)

## Results

Despite the bandwidth constraints of our 8 research scientists, we launched our napari learning platform with time to polish video content, and refine our UI.

- Our "napari cell segmentation" course included **15 modules, an extensive installation of Python, and 3 workflows** for new users to replicate.
- Biology PhDs at low-tech research labs (without expensive software) can now reliably install napari and apply it in the field of microscopy.
- The napari community **has blossomed to include 300+ plugins** on napari-hub.org, gaining adoption alongside tools like Fiji and CellProfiler.

![Setup tutorial page](/images/portfolio/setup-tutorial.jpg)

## Takeaways

On a small team operating under a tight deadline—with external variables beyond your control—**your project plan must be nimble and adaptable.** Milestones should help you reach consensus and gather feedback at critical stages. But in the face of the unforeseen, you have to **take charge and maintain morale** to deliver your MLP (minimal-*lovable*-product).
