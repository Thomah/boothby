# Introduction

Boothby is a french bot available on Slack which publish tips and news about Green IT. Each publication is pre-written on a dedicated web interface and when the CRON is triggered, Boothby sends it on a Slack Workspace.

# Architecture

This software depends on two external components :
- The Slack API
- A MongoDB database

Furthermore, this software is devivded in two main components :
- The web interface, located in `public` folder
- The backend written in NodeJS inside `src` folder

# Prerequisites

# Run the app

## On a development workstation

### On Windows

### On Linux

## On a Ubuntu production environment

# How to contribute

## Access rights

These are the accounts you may need to contribute on this project. You'll not have these automatically. Please ask team members for them :)
- GitHub account granted on this repo
- Credentials for the MongoDB production database
- Account on the production VM with SSH Key deployed

## Project management

Wanna work on this project ? You're welcome :)

First of all, you need to know that each release is described with a dedicated [Milestone](https://github.com/valeuriad-techlab/Boothby/milestones) and [Project](https://github.com/valeuriad-techlab/Boothby/projects). Just pick an issue you're comfortable with, assign it to yourself and move the issue inside the Project Kanban.

Any code modification should be done on a dedicated branch and when your modifications are ok (=tested a least on your workstation), just submit a [Pull Request](https://github.com/valeuriad-techlab/Boothby/pulls) to another active member of the project. Be carefull with the description by adding every breaking change (environment variable to add, change of database structure, etc.).

When the Pull Request is merged, you can close the issue, move it inside the Kanban and pick another one.

If you have any idea, just propose them in the [Issue](https://github.com/valeuriad-techlab/Boothby/issues) page and don't hesitate to ping someone of the team to discuss them :)

# Contact

- Creator : [@Thomah](https://github.com/thomah)
- Developer : [@JimmyDore](https://github.com/JimmyDore)