import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardLinkOverlay } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, MapPin, PackageOpen, PackageX, SlidersHorizontal, Snowflake, Trash2, User, Utensils } from 'lucide-react';
import type { StoredItem } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import type { StorageArea } from '@/services/storageAreaService';
import { ExitActionModal } from '@/components/ExitActionModal';
import { StockExitType } from '@/types/enums';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/utils/dateFormatting';
import { ItemImage } from '@/components/ItemImage';
import { CategoryIcon } from '@/utils/categoryIcons';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { getCategoryColor, getItemDisplayName } from '@/utils/itemUtils';
import { getDisplayUnitLabel } from '@/utils/unitSystem';
import { ItemCategory, StorageAreaType } from '@/types/enums';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { toast } from 'sonner';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getFreezerProgressDisplay } from '@/utils/freezerProgress';
import { freezerTone, toneBadgeClass, toneTextClass } from '@/lib/tokenMaps';

interface MyProductsItemCardProps {
  storedItem: StoredItem;
  item: Item | undefined;
  area: StorageArea | undefined;
  currentUserId: string | undefined;
  onDelete?: (storedItemId: string) => void;
  /** When true, do not render the navigation overlay / navigate on card click. */
  disableNavigate?: boolean;
  /** When true, hide the storage-area badge chip (redundant inside a single area). */
  hideAreaBadge?: boolean;
}

function getDaysUntilExpiration(expirationDate?: string | null): number | null {
  if (!expirationDate) return null;
  const expDate = new Date(expirationDate);
  const diffMs = expDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getDaysSince(date: string): number {
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function MyProductsItemCard({
  storedItem,
  item,
  area,
  currentUserId,
  onDelete,
  disableNavigate,
  hideAreaBadge,
}: MyProductsItemCardProps) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();
  const updateStoredItem = useStoredItemStore((s) => s.updateStoredItem);
  const exitStoredItem = useStoredItemStore((s) => s.exitStoredItem);
  const getStorageAreasForHousehold = useStorageAreaStore((s) => s.getStorageAreasForHousehold);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const swipeX = useMotionValue(0);

  const isCookedMeal = item?.category === ItemCategory.COOKED_MEAL;
  const linkedRecipeId = item?.recipeId ?? null;
  const isInFreezer = area?.type === StorageAreaType.FREEZER;

  const handleOpenRecipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedRecipeId) navigate(`/recipes/${linkedRecipeId}`);
  };

  const handleFreeze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const freezer = getStorageAreasForHousehold().find((a) => a.type === StorageAreaType.FREEZER);
    if (!freezer) {
      toast.error(t('pages.dashboard.expiringSoon.noFreezer'));
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateStoredItem(storedItem.id, {
        storageAreaId: freezer.id,
        frozenDate: today,
        expirationDate: null,
      });
    } catch {
      // toast already raised by store
    }
  };

  if (!item) {
    return (
      <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  const goToArea = () => {
    if (area) navigate(`/storage/${area.id}`);
  };

  const handleAreaBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToArea();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(storedItem.id);
  };

  const handleExit = async (type: StockExitType, quantity = 1) => {
    try {
      await exitStoredItem(storedItem.id, type, quantity);
    } catch {
      // toast already raised by store
    }
  };

  const handleQuickConsume = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleExit(StockExitType.CONSUMED, 1);
  };

  const handleOpenExitModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExitModalOpen(true);
  };

  const expirationSource = storedItem.effectiveExpirationDate || storedItem.expirationDate;
  const isFreezerArea = area?.type === StorageAreaType.FREEZER;
  const daysUntilExpiration = getDaysUntilExpiration(expirationSource);

  // Fresh charter — pill plein pour les états critiques (expired/2j) pour
  // qu'ils crient ; pill soft pour "use soon" et "fresh" (info plus calme).
  const expirationBadge = (() => {
    if (isFreezerArea || daysUntilExpiration === null) return null;
    const base =
      'inline-flex items-center rounded-full px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider leading-none';
    if (daysUntilExpiration < 0) {
      return (
        <span className={`${base} bg-mf-danger text-white`}>
          {t('storageArea.expiredSince', { count: Math.abs(daysUntilExpiration) })}
        </span>
      );
    }
    if (daysUntilExpiration <= 2) {
      return (
        <span className={`${base} bg-mf-danger text-white`}>
          {t('storageArea.expiresIn', { days: daysUntilExpiration })}
        </span>
      );
    }
    if (daysUntilExpiration <= 7) {
      return (
        <span className={`${base} bg-mf-warning-soft text-mf-warning`}>
          {t('storageArea.expiresIn', { days: daysUntilExpiration })}
        </span>
      );
    }
    return (
      <span className={`${base} bg-mf-green-soft text-mf-green-deep`}>
        {t('storageArea.fresh', { days: daysUntilExpiration })}
      </span>
    );
  })();

  const openedDaysAgo =
    storedItem.isOpened && storedItem.openedDate ? getDaysSince(storedItem.openedDate) : null;

  // Freezer progress — identical section to the storage-area detail card.
  const freezerProgress = getFreezerProgressDisplay(storedItem, area?.type);
  const freezerOverRecommended =
    freezerProgress != null && freezerProgress.current > freezerProgress.total;
  const showFreezerWarning = Boolean(storedItem.isFrozenTooLong || freezerOverRecommended);

  // Quantity label: unit word for measurable units, else the item noun ("6 yaourts").
  const quantityDisplayName = getItemDisplayName(item, t);
  const quantityUnitLabel = getDisplayUnitLabel(storedItem.unit, Number(storedItem.quantity), t, {
    item,
    itemName: quantityDisplayName,
  });
  const quantityLabel = quantityUnitLabel || quantityDisplayName.toLowerCase();

  return (
    <div className="relative isolate">
      {!disableNavigate && (
        <CardLinkOverlay
          aria-label={`${getItemDisplayName(item, t)} — ${area?.name ?? ''}`}
          onClick={goToArea}
        />
      )}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Swipe-left reveal (mobile): quick "Consommé" action. */}
        {isMobile && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-end bg-mf-green pr-6 text-white">
            <span className="flex items-center gap-2 font-display text-sm font-bold">
              <Utensils className="h-5 w-5" />
              {t('stockExit.consumed')}
            </span>
          </div>
        )}
        <motion.div
          style={isMobile ? { x: swipeX, touchAction: 'pan-y' } : undefined}
          drag={isMobile ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.7, right: 0, top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x <= -80) {
              // Swipe consumes the whole line.
              handleExit(StockExitType.CONSUMED, Number(storedItem.quantity));
            }
            animate(swipeX, 0, { type: 'spring', stiffness: 500, damping: 40 });
          }}
        >
      <Card
        className={cn(
          'group relative z-[1] rounded-2xl bg-card backdrop-blur-sm border-0 shadow-lg mf-motion-card hover:shadow-xl',
          !disableNavigate &&
            'pointer-events-none [&_button]:pointer-events-auto [&_button]:relative [&_button]:z-10 [&_a]:pointer-events-auto [&_a]:relative [&_a]:z-10'
        )}
      >
      <CardContent
        className={cn('p-4', disableNavigate && 'cursor-pointer')}
        onClick={disableNavigate ? () => setExitModalOpen(true) : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <ItemImage
            src={item.imageUrl}
            alt={getItemDisplayName(item, t)}
            containerClassName="w-20 h-20 rounded-lg"
            fallbackIconSize={40}
            category={item.category}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-medium text-foreground">{getItemDisplayName(item, t)}</h3>

              {area && !hideAreaBadge && (
                <button
                  type="button"
                  onClick={handleAreaBadgeClick}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                  aria-label={`${t('pages.myProducts.filterByArea')} — ${area.name}`}
                >
                  <StorageAreaIcon type={area.type} className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[10rem]">{area.name}</span>
                </button>
              )}

              {storedItem.isOpened && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-mf-warning-soft text-mf-warning"
                >
                  <PackageOpen className="h-3 w-3 mr-1" />
                  {t('storedItems.opened')}
                </Badge>
              )}

              {freezerProgress && (
                <Badge
                  variant={showFreezerWarning ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs',
                    !showFreezerWarning &&
                      toneBadgeClass(
                        freezerTone(freezerProgress.current, freezerProgress.total)
                      )
                  )}
                >
                  <Snowflake className="h-3 w-3 mr-1" />
                  {showFreezerWarning ? t('storedItems.freezerWarning') : t('storedItems.frozen')}
                </Badge>
              )}

              {expirationBadge}
            </div>

            <div className="mb-2">
              <Badge
                variant="outline"
                className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}
              >
                <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
                {t(`items.categories.${item.category}`)}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground empty:hidden">
                {storedItem.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{storedItem.location}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  {(() => {
                    const creator = storedItem.creator;
                    const addedDate = formatDate(new Date(storedItem.createdAt), 'd MMM');
                    if (!creator) {
                      return (
                        <>
                          <User className="h-3 w-3" />
                          <span>{`${t('storageArea.added')} ${addedDate}`}</span>
                        </>
                      );
                    }
                    const authorName =
                      creator.id === currentUserId ? t('common.you') : creator.displayName;
                    // Avatar initials always from the real name (never "T" for "Toi").
                    const initials = creator.displayName
                      .trim()
                      .split(/\s+/)
                      .map((w) => w.charAt(0))
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    return (
                      <>
                        {/* Desktop: avatar + "Ajouté par … le …" text. */}
                        <span className="hidden sm:inline-flex items-center gap-1.5">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mf-text text-mf-night dark:bg-mf-night dark:text-mf-text text-[9px] font-bold uppercase leading-none">
                            {initials}
                          </span>
                          <span>{t('common.addedByOn', { name: authorName, date: addedDate })}</span>
                        </span>
                        {/* Mobile: compact avatar chip + date. */}
                        <span className="sm:hidden inline-flex items-center gap-1.5 min-w-0">
                          <span className="inline-flex items-center gap-1 rounded-full bg-mf-night-elevated pl-0.5 pr-2 py-0.5">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mf-text text-mf-night dark:bg-mf-night dark:text-mf-text text-[9px] font-bold uppercase leading-none">
                              {initials}
                            </span>
                            <span className="text-[11px] font-medium truncate">{authorName}</span>
                          </span>
                          <span className="text-[11px] whitespace-nowrap">· {addedDate}</span>
                        </span>
                      </>
                    );
                  })()}
                </div>

                {freezerProgress && (
                  <div className="flex items-center gap-1">
                    <Snowflake className="h-3 w-3" />
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'inline cursor-help border-0 bg-transparent p-0 text-left font-medium underline decoration-dotted decoration-current underline-offset-2',
                            toneTextClass(
                              freezerTone(freezerProgress.current, freezerProgress.total)
                            )
                          )}
                        >
                          {t('storedItems.frozenProgress', {
                            current: freezerProgress.current,
                            count: freezerProgress.total,
                          })}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>
                          {t('storedItems.freezerRecommendation', {
                            category: t(`items.categories.${item.category}`),
                            count: Math.max(1, Math.round(freezerProgress.total / 30)),
                          })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {expirationSource &&
                  !isFreezerArea &&
                  daysUntilExpiration !== null &&
                  daysUntilExpiration >= 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {t('storageArea.expiresOn', {
                          date: formatDate(new Date(expirationSource), 'MMM d'),
                        })}
                      </span>
                    </div>
                  )}

                {isCookedMeal && storedItem.cookedDate && (
                  <div className="flex items-center gap-1 text-mf-green-deep">
                    <ChefHat className="h-3 w-3" />
                    <span>
                      {(() => {
                        const days = getDaysSince(storedItem.cookedDate);
                        if (days === 0) return t('cookedMeal.cookedToday');
                        return t('cookedMeal.cookedAgo', { count: 1 });
                      })()}
                    </span>
                  </div>
                )}

                {openedDaysAgo !== null && (
                  <div className="flex items-center gap-1 text-mf-warning">
                    <PackageOpen className="h-3 w-3" />
                    <span>
                      {openedDaysAgo === 0
                        ? t('pages.myProducts.openedToday')
                        : t('pages.myProducts.openedDaysAgo', { count: openedDaysAgo })}
                    </span>
                  </div>
                )}

                {isCookedMeal && linkedRecipeId && (
                  <button
                    type="button"
                    onClick={handleOpenRecipe}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ChefHat className="h-3 w-3" />
                    <span>{t('cookedMeal.openRecipe')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            {/* Quantité mise en avant (maquette : nombre + unité). */}
            <div className="shrink-0 text-right flex items-baseline justify-end gap-1 sm:block sm:leading-none">
              <span className="font-display font-extrabold text-foreground tabular-nums text-sm sm:text-xl">
                {Number(storedItem.quantity)}
              </span>
              <span className="text-muted-foreground text-[11px] sm:mt-1 sm:block">
                {quantityLabel}
              </span>
            </div>

            {/* Actions rapides : colonne sur mobile, rangée qui se déploie au survol sur desktop. */}
            <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-2 sm:overflow-hidden sm:max-w-0 sm:opacity-0 sm:transition-all sm:duration-200 sm:group-hover:max-w-[360px] sm:group-hover:opacity-100 sm:group-focus-within:max-w-[360px] sm:group-focus-within:opacity-100">
              {isCookedMeal && !isInFreezer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFreeze}
                  className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-[13px] shrink-0 bg-mf-info-soft text-mf-info hover:bg-mf-info-soft/80"
                  aria-label={t('pages.dashboard.expiringSoon.actionFreeze')}
                  title={t('pages.dashboard.expiringSoon.actionFreeze')}
                >
                  <Snowflake className="h-5 w-5" />
                </Button>
              )}

              {/* Consommé — geste unique, vert plein. */}
              <Button
                variant="green"
                size="sm"
                onClick={handleQuickConsume}
                className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-[13px] shrink-0"
                aria-label={t('stockExit.consumed')}
                title={t('stockExit.consumed')}
              >
                <Utensils className="h-5 w-5" />
              </Button>

              {/* Jeté — rouge clair. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExit(StockExitType.WASTED, 1);
                }}
                className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-[13px] shrink-0 bg-mf-danger-soft text-mf-danger hover:bg-mf-danger-soft/80"
                aria-label={t('stockExit.wasted')}
                title={t('stockExit.wasted')}
              >
                <Trash2 className="h-5 w-5" />
              </Button>

              {/* Retiré — neutre beige. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExit(StockExitType.REMOVED, 1);
                }}
                className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-[13px] shrink-0 bg-muted text-muted-foreground hover:bg-muted/70"
                aria-label={t('stockExit.removed')}
                title={t('stockExit.removed')}
              >
                <PackageX className="h-5 w-5" />
              </Button>

              {/* Plus — quantité précise via modal. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExitModal}
                className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-[13px] shrink-0 bg-muted text-muted-foreground hover:bg-muted/70"
                aria-label={t('stockExit.preciseQuantity')}
                title={t('stockExit.preciseQuantity')}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      </Card>
        </motion.div>
      </div>

      <ExitActionModal
        open={exitModalOpen}
        onOpenChange={setExitModalOpen}
        storedItem={storedItem}
        item={item}
        onExit={(type, quantity) => handleExit(type, quantity)}
      />
    </div>
  );
}
