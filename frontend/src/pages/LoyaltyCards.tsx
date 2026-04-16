import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, X, CreditCard } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import BarcodeDisplay from '@/components/BarcodeDisplay';
import LoyaltyCardForm from '@/components/LoyaltyCardForm';
import { StoreLogo } from '@/components/StoreSelector';
import { useLoyaltyCardStore } from '@/stores/loyaltyCardStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { getStoreBySlug } from '@/data/storeCatalog';
import { LoyaltyCard } from '@/services/loyaltyCardService';
import { CreateLoyaltyCardRequest } from '@/services/loyaltyCardService';
import { BarcodeFormat } from '@/types/enums';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LoyaltyCards = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  useProtectedRoute();

  const {
    fetchLoyaltyCards,
    createLoyaltyCard,
    deleteLoyaltyCard,
    getLoyaltyCardsForHousehold,
    loading,
  } = useLoyaltyCardStore();

  const selectedHouseholdId = useHouseholdStore((s) => s.selectedHouseholdId);
  const households = useHouseholdStore((s) => s.households);
  const fetchHouseholds = useHouseholdStore((s) => s.fetchHouseholds);

  const householdId =
    selectedHouseholdId ?? (households.length > 0 ? households[0].id : null);

  const [showForm, setShowForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<LoyaltyCard | null>(null);

  useEffect(() => {
    if (households.length === 0) {
      void fetchHouseholds();
    }
  }, [fetchHouseholds, households.length]);

  useEffect(() => {
    if (!householdId) return;
    void fetchLoyaltyCards();
  }, [householdId, fetchLoyaltyCards]);

  const loyaltyCards = getLoyaltyCardsForHousehold();

  const handleCreate = async (data: CreateLoyaltyCardRequest) => {
    await createLoyaltyCard(data);
    toast({
      title: t('loyaltyCards.messages.created'),
    });
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    try {
      await deleteLoyaltyCard(cardToDelete.id);
      setCardToDelete(null);
      if (selectedCard?.id === cardToDelete.id) setSelectedCard(null);
      toast({ title: t('loyaltyCards.messages.deleted') });
    } catch {
      toast({ title: t('loyaltyCards.messages.deleteFailed'), variant: 'destructive' });
    }
  };

  const CardLogo = ({ card }: { card: LoyaltyCard }) => {
    const catalogEntry = card.storeSlug ? getStoreBySlug(card.storeSlug) : null;

    if (catalogEntry) {
      return <StoreLogo store={catalogEntry} size="md" />;
    }

    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ backgroundColor: card.color || '#6B7280' }}
      >
        {card.storeName.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Full-screen barcode view
  if (selectedCard) {
    const catalogEntry = selectedCard.storeSlug ? getStoreBySlug(selectedCard.storeSlug) : null;
    const bgColor = catalogEntry?.color || selectedCard.color || '#1f2937';

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCard(null)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-white font-bold text-lg">{selectedCard.storeName}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCardToDelete(selectedCard)}
            className="text-red-400 hover:text-red-300 hover:bg-white/20"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {catalogEntry && (
            <StoreLogo store={catalogEntry} size="md" />
          )}

          {selectedCard.barcodeData && selectedCard.barcodeFormat ? (
            <BarcodeDisplay
              data={selectedCard.barcodeData}
              format={selectedCard.barcodeFormat}
              height={120}
              className="w-full max-w-sm"
            />
          ) : (
            <div className="bg-white rounded-lg p-6 text-center">
              <p className="text-2xl font-mono font-bold tracking-widest text-black">
                {selectedCard.cardNumber}
              </p>
            </div>
          )}

          <p className="text-white/80 text-sm font-mono">{selectedCard.cardNumber}</p>

          {selectedCard.notes && (
            <p className="text-white/60 text-sm text-center">{selectedCard.notes}</p>
          )}
        </div>

        <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('loyaltyCards.deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('loyaltyCards.deleteConfirm.description', { store: cardToDelete?.storeName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {t('buttons.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('loyaltyCards.title')}</h1>
            <Button
              variant="green"
              className="touch-friendly shrink-0 flex items-center gap-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('buttons.add')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading && loyaltyCards.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : loyaltyCards.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('loyaltyCards.empty.title')}</h3>
              <p className="text-muted-foreground mt-1">{t('loyaltyCards.empty.description')}</p>
            </div>
            <Button variant="green" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('loyaltyCards.empty.addFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loyaltyCards.map((card) => {
              const catalogEntry = card.storeSlug ? getStoreBySlug(card.storeSlug) : null;
              const cardColor = catalogEntry?.color || card.color || '#6B7280';

              return (
                <Card
                  key={card.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-0"
                  onClick={() => setSelectedCard(card)}
                >
                  <div
                    className="h-2"
                    style={{ backgroundColor: cardColor }}
                  />
                  <CardContent className="p-4 flex items-center gap-4">
                    <CardLogo card={card} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{card.storeName}</h3>
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {card.cardNumber}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <LoyaltyCardForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreate}
      />

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('loyaltyCards.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('loyaltyCards.deleteConfirm.description', { store: cardToDelete?.storeName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation currentPage="loyalty-cards" />
    </div>
  );
};

export default LoyaltyCards;
