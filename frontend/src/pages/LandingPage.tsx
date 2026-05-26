import { Link } from 'react-router-dom'
import {
  Cloud, Upload, Lock, Link2, Shield, Zap, Database, Github,
  ArrowRight, Check, Clock, Hash, Server, Eye, Sun, Moon, MonitorSmartphone,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function LandingPage() {
  const { theme, cycle } = useTheme()
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100">
      {/* ─── Navigation ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-slate-950/70 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Accueil FileShare">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <Cloud className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold">FileShare</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Sections">
            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Fonctionnalités</a>
            <a href="#security" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Sécurité</a>
            <a href="#stack" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Stack</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={cycle}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label={`Thème : ${theme}`}
              type="button"
              title={`Thème : ${theme}`}
            >
              <ThemeIcon className="w-4 h-4" aria-hidden="true" />
            </button>
            <Link to="/login" className="btn-ghost text-sm hidden sm:inline-flex">
              Connexion
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Commencer
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-950 dark:to-purple-950/30 -z-10" aria-hidden="true" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl -z-10" aria-hidden="true" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl -z-10" aria-hidden="true" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-6 border border-blue-200 dark:border-blue-800/60">
            <Zap className="w-3 h-3" aria-hidden="true" />
            Auto-hébergé · Open source · Sécurisé
          </span>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Partagez vos fichiers <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              en toute sécurité.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300 text-balance">
            FileShare est une plateforme de partage de fichiers auto-hébergée, avec
            authentification JWT, liens de partage protégés par mot de passe et panel
            d'administration intégré.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="btn-primary py-3 px-6 text-base shadow-lg shadow-blue-600/20">
              Créer un compte gratuit
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link to="/login" className="btn-secondary py-3 px-6 text-base">
              J'ai déjà un compte
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Aucune carte bancaire · Compte créé en 10 secondes · 5 Go de stockage offerts
          </p>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28 bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tout ce qu'il faut, rien de superflu
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Une stack moderne pensée pour la sécurité et la simplicité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Upload}
              title="Upload sans limite de type"
              description="Glissez-déposez n'importe quel fichier — images, vidéos, archives, exécutables. Suivi de progression en temps réel."
              color="blue"
            />
            <FeatureCard
              icon={Link2}
              title="Liens de partage avancés"
              description="Mot de passe, date d'expiration, nombre maximum de téléchargements, lecture seule ou téléchargement complet."
              color="purple"
            />
            <FeatureCard
              icon={Lock}
              title="Authentification robuste"
              description="JWT à durée courte (15 min) + refresh tokens hachés en base, mots de passe bcrypt à 12 rounds."
              color="green"
            />
            <FeatureCard
              icon={Shield}
              title="Panel d'administration"
              description="Statistiques en temps réel, gestion des utilisateurs, audit complet des accès, monitoring système."
              color="orange"
            />
            <FeatureCard
              icon={Database}
              title="Quotas par utilisateur"
              description="Limites configurables par compte, suivi de l'usage en temps réel, sans course condition (SQL atomique)."
              color="cyan"
            />
            <FeatureCard
              icon={Eye}
              title="Audit complet"
              description="Tous les accès aux fichiers partagés sont journalisés avec IP, user-agent et horodatage."
              color="pink"
            />
          </div>
        </div>
      </section>

      {/* ─── Comment ça marche ─────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              En trois étapes
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              De zéro à partage public en moins d'une minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step
              number="01"
              title="Créez votre compte"
              description="Inscription en 10 secondes, sans CB. Vous obtenez 5 Go de stockage par défaut."
            />
            <Step
              number="02"
              title="Uploadez vos fichiers"
              description="Drag-and-drop dans votre tableau de bord. Tous les types de fichiers sont acceptés."
            />
            <Step
              number="03"
              title="Partagez en sécurité"
              description="Générez un lien public, ajoutez un mot de passe, fixez une date d'expiration."
            />
          </div>
        </div>
      </section>

      {/* ─── Sécurité ──────────────────────────────────────────── */}
      <section id="security" className="py-20 md:py-28 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              La sécurité d'abord
            </h2>
            <p className="mt-4 text-blue-100 max-w-2xl mx-auto">
              Chaque composant a été pensé pour limiter la surface d'attaque.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <SecurityItem text="Mots de passe bcrypt 12 rounds (jamais en clair)" />
            <SecurityItem text="JWT signés HS256, durée de vie 15 minutes" />
            <SecurityItem text="Refresh tokens hachés SHA-256 en base" />
            <SecurityItem text="Rotation systématique des refresh tokens" />
            <SecurityItem text="Helmet + CORS strict + headers de sécurité" />
            <SecurityItem text="Rate-limiting sur /auth et endpoints publics" />
            <SecurityItem text="Sanitization anti path-traversal des fichiers" />
            <SecurityItem text="Validation atomique du quota (anti race-condition)" />
            <SecurityItem text="Content-Disposition: attachment (pas de XSS via upload)" />
            <SecurityItem text="Tokens d'accès jamais loggés (Prisma + Fastify)" />
          </div>
        </div>
      </section>

      {/* ─── Stack ─────────────────────────────────────────────── */}
      <section id="stack" className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Stack moderne
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Des outils battle-tested, pas des modes passagères.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StackBadge label="React 18" />
            <StackBadge label="TypeScript" />
            <StackBadge label="Vite 6" />
            <StackBadge label="TailwindCSS" />
            <StackBadge label="Fastify 4" />
            <StackBadge label="Prisma 5" />
            <StackBadge label="PostgreSQL 16" />
            <StackBadge label="Redis 7" />
            <StackBadge label="Docker" />
            <StackBadge label="Vitest" />
            <StackBadge label="Zod" />
            <StackBadge label="Zustand" />
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <Stat icon={Clock} value="15 min" label="durée de vie JWT" />
            <Stat icon={Hash} value="12 rounds" label="bcrypt" />
            <Stat icon={Server} value="78+" label="tests automatisés" />
          </div>
        </div>
      </section>

      {/* ─── CTA final ─────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Prêt à partager ?
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Créez votre compte maintenant. Vous serez opérationnel en moins d'une minute.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn-primary py-3 px-6 text-base shadow-lg shadow-blue-600/20">
              Créer un compte gratuit
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link to="/login" className="btn-secondary py-3 px-6 text-base">
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
              <Cloud className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
            <span className="font-medium">FileShare</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>v0.4.0</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              GitHub
            </a>
            <Link to="/login" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              S'inscrire
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon, title, description, color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: 'blue' | 'purple' | 'green' | 'orange' | 'cyan' | 'pink'
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
    green: 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
    cyan: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
    pink: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-400',
  }
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative">
      <div className="font-mono text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600 mb-3">
        {number}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function SecurityItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-blue-50">
      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="w-3 h-3" aria-hidden="true" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  )
}

function StackBadge({ label }: { label: string }) {
  return (
    <div className="card px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:shadow-md transition-shadow">
      {label}
    </div>
  )
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="card p-5">
      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" aria-hidden="true" />
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}
