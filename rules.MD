Un chatbot météo qui donne des conseils pratiques en temps réel


Cahiers des Charges

1. PRÉSENTATION DU PROJET
WeatherBot est un chatbot conversationnel qui interroge une API météo externe et formule des conseils
pratiques adaptés aux conditions du moment : "Il va pleuvoir à Yaoundé cet après-midi, prends ton
parapluie." L'objectif est de combiner intégration d'API externe et logique de recommandation intelligente.

2. INFORMATIONS GÉNÉRALES
Nom du projet WeatherBot Intelligent
Type Chatbot web / CLI

3. OBJECTIFS
3.1 Objectif principal
Construire un chatbot capable de répondre aux questions météo d'un utilisateur en interrogeant une API
externe et en formulant des recommandations contextuelles utiles.
3.2 Objectifs secondaires
• Maîtriser l'intégration d'une API REST externe
• Implémenter une logique de recommandation basée sur les données météo
• Créer une interface conversationnelle simple et intuitive

4. FONCTIONNALITÉS
4.1 Must-have (MVP)
• Saisie d'une ville par l'utilisateur
• Récupération météo en temps réel via OpenWeatherMap API
• Affichage : température, conditions, humidité, vent
• Génération de conseils contextuels automatiques
◦ Pluie → "Prends ton parapluie"
◦ Chaleur > 35°C → "Reste hydraté, évite le soleil entre 12h et 15h"
◦ Vent fort → "Évite les zones dégagées"
• Interface chat (messages question / réponse)
4.2 Nice-to-have
• Prévision sur 3 jours
• Détection automatique de la ville via géolocalisation
• Réponses en français et en anglais

5. STACK TECHNIQUE SUGGÉRÉE

Cahiers des Charges — Café Cursor Yaoundé · 18 Avril 2026

Couche Technologie Rôle
Frontend HTML / CSS / React Interface chat

Backend Node.js (Express) ou Python

(FastAPI) Logique serveur
API Météo OpenWeatherMap (free tier) Données météo
Conseils Logique conditionnelle custom Recommandations

API KEY : S'inscrire sur openweathermap.org — la clé gratuite suffit pour le projet. Prévoir 10 min
pour l'activation. Pour le Chat utiliser le SDK de OpenAI avec GitHub copilote.

6. LOGIQUE DE RECOMMANDATION
Condition météo Conseil généré
Pluie / Orage "Prends ton parapluie, il va pleuvoir"
Température > 35°C "Forte chaleur — hydrate-toi et évite le soleil"
Température < 15°C "Il fait frais — prévois une veste"
Vent > 50 km/h "Vent fort — fais attention en extérieur"
Ciel dégagé "Belle journée, profites-en !"
Brouillard "Visibilité réduite — sois prudent sur la route"


Concernant l'interface: 
il y aura une interface principale divisee en 2 parties qui aura:
- une zone ou defilent des meteo de diverses villes de maniere aleatoire
- une zone avec une description plus detaillee de la meteo de la ville active dans la zone de defilement
- un bouton en bas au coin droit avec un icone de bot qui ouvre une popup avec un chatbot qui permet de discuter avec le bot et de lui demander des informations sur la meteo de la ville de notre choix il nous enverra alors un message avec les informations sur la meteo de la ville de notre choix et une image qui decrit la meteo de la ville de notre choix
- Un bouton au dessus du bouton du chatbot qui permet de nous donner les informations sur la meteo relative a notre position sur la 
- Des messages drolent qui apparraitront de temps en temps qui nous donneront des informations sur la meteo de la ville active dans la zone de defilement

Le theme de couleur devra varier en fonction de la meteo de la ville active dans la zone de defilement (Orange pour le soleil, bleu pour le ciel couvert, gris pour le brouillard, etc.)
L'arriere plan dependra aussi de la meteo de la ville active dans la zone de defilement (image de la ville active dans la zone de defilement)