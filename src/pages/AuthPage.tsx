import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '../components/ui/loading-state';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, isLoading, isRoleLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if user exists and auth/role checks are complete
    if (user && !isLoading && !isRoleLoading) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, isLoading, isRoleLoading, navigate, location]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    if (isSignUp) {
      if (!formData.firstName) {
        newErrors.firstName = 'Prénom requis';
      }
      
      if (!formData.lastName) {
        newErrors.lastName = 'Nom requis';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmation requise';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Mots de passe différents';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Compte créé ! Vérifiez votre email pour confirmer.');
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Connexion réussie !');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erreur d\'authentification');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const inputClasses = (field: string) => `
    w-full px-4 py-3 pl-12 rounded-lg border transition-colors duration-200
    ${errors[field] 
      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20' 
      : 'border-input bg-background focus:border-primary focus:ring-primary/20'
    }
    focus:ring-2 focus:outline-none
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-info/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-elevated p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isSignUp ? 'Créer un compte' : 'Se connecter'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp 
                ? 'Rejoignez Magic SEO et dominez Google' 
                : 'Connectez-vous à votre tableau de bord'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={inputClasses('firstName')}
                      placeholder="Jean"
                      disabled={loading}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nom
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={inputClasses('lastName')}
                      placeholder="Dupont"
                      disabled={loading}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClasses('email')}
                  placeholder="votre@email.com"
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={inputClasses('password')}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={inputClasses('confirmPassword')}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full btn-gradient text-lg py-4 mt-8"
            >
              {loading ? (
                <LoadingState size="sm" className="text-primary-foreground" />
              ) : (
                <>
                  {isSignUp ? 'Créer mon compte' : 'Se connecter'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
                setFormData({
                  email: '',
                  password: '',
                  firstName: '',
                  lastName: '',
                  confirmPassword: ''
                });
              }}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
              disabled={loading}
            >
              {isSignUp 
                ? 'Déjà un compte ? Se connecter' 
                : 'Pas de compte ? Créer un compte'
              }
            </button>
          </div>

          {isSignUp && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm text-primary">
                  <p className="font-medium mb-1">Votre compte inclut :</p>
                  <ul className="space-y-1 text-xs">
                    <li>• 14 jours d'essai gratuit</li>
                    <li>• Génération illimitée de contenu IA</li>
                    <li>• Analytics SEO avancés</li>
                    <li>• Support technique prioritaire</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}