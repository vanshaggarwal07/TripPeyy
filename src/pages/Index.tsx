import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plane, 
  MapPin, 
  DollarSign, 
  Compass, 
  Globe, 
  TrendingUp,
  Users,
  Camera,
  Navigation,
  ArrowRight,
  Star,
  Heart,
  Shield,
  Smartphone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import heroImage from '@/assets/hero-travel.jpg';
import culturalImage from '@/assets/cultural-experience.jpg';
import budgetImage from '@/assets/budget-tracking.jpg';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Cultural travel destinations" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-background/80 to-secondary/20" />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="absolute top-40 -left-32 h-80 w-80 rounded-full bg-secondary/10 blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          <div className="absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        </div>

        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 p-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Compass className="h-8 w-8 text-primary" />
                <MapPin className="h-6 w-6 text-secondary" />
                <Plane className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  TripPey
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="hero">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/auth">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="hero">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2">
              🌍 Cultural Travel Platform
            </Badge>
            <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Discover <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Cultures</span>
              <br />
              Track <span className="bg-gradient-to-r from-accent via-cultural to-primary bg-clip-text text-transparent">Budgets</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience authentic cultural immersion while managing your travel expenses efficiently. 
              Discover hidden gems, connect with locals, and create unforgettable memories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {!user && (
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                  Start Your Journey
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            )}
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-background/80 backdrop-blur-sm">
              <Globe className="h-5 w-5 mr-2" />
              Explore Features
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">150+</div>
              <p className="text-muted-foreground">Cultural Destinations</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">$2M+</div>
              <p className="text-muted-foreground">Budget Tracked</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">10K+</div>
              <p className="text-muted-foreground">Happy Travelers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-r from-card/50 to-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Why Choose TripPey?</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The perfect blend of cultural discovery and smart budget management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-travel)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Cultural Discovery</CardTitle>
                <CardDescription>
                  Find authentic local experiences, hidden gems, and cultural hotspots recommended by locals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <img src={culturalImage} alt="Cultural experiences" className="w-full h-40 rounded-lg object-cover" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-cultural)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <DollarSign className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Smart Budget Tracking</CardTitle>
                <CardDescription>
                  Monitor expenses in real-time, set budget limits, and get insights to optimize your travel spending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <img src={budgetImage} alt="Budget tracking" className="w-full h-40 rounded-lg object-cover" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-warm)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Navigation className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Interactive Maps</CardTitle>
                <CardDescription>
                  Explore destinations with our integrated maps, find nearby attractions, and plan your route.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <img src={heroImage} alt="Travel mapping" className="w-full h-40 rounded-lg object-cover" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-travel)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-cultural/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cultural/20 transition-colors">
                  <Users className="h-6 w-6 text-cultural" />
                </div>
                <CardTitle>Local Community</CardTitle>
                <CardDescription>
                  Connect with fellow travelers and local guides to enhance your cultural immersion experience.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-cultural)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your travel data and financial information are protected with enterprise-grade security.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-[var(--shadow-elevation)] hover:shadow-[var(--shadow-warm)] transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
                  <Smartphone className="h-6 w-6 text-warning" />
                </div>
                <CardTitle>Mobile Friendly</CardTitle>
                <CardDescription>
                  Access your travel plans and track expenses on any device, anywhere in the world.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-4xl font-bold mb-6">Ready to Start Your Cultural Journey?</h3>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of travelers who are discovering authentic cultures while staying within budget.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Loved by 10K+ Users</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="flex items-center gap-1">
                <Compass className="h-6 w-6 text-primary" />
                <MapPin className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  TripPey
                </h4>
                <p className="text-sm text-muted-foreground">Cultural Travel Platform</p>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © 2024 TripPey. Discover cultures, track budgets, create memories.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
