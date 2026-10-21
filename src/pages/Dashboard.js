import { motion } from "framer-motion";
import PageDataSkeleton from "../components/PageDataSkeleton";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import "tippy.js/dist/tippy.css";
import { FaListAlt, FaTags, FaRegCalendarCheck } from "react-icons/fa";
import {
  getCategoriesDataAction,
  getDataAction,
  getPaymentDataAction,
  getTotalBalance,
  deleteCardAction,
  setSelectedFilter,
} from "../actionCreators/databaseActions";
import BarChartWrapper from "../components/BarChartWrapper";
import Card from "../components/Card";
import ExpenseFilter, { describeSelectedPeriod } from "../components/ExpenseFilter";
import BimonetarySummary from "../components/BimonetarySummary";
import FloatingMenu from "../components/FloatingMenu";
import GenericModal from "../components/GenericModal";
import DeleteTransactionDialog from "../components/DeleteTransactionDialog";
import LitaAssistantPanel from "../components/LitaAssitantPanel";
import { summarizeSpendingByCategory } from '../utils/litaSpendingSummary';
import SearchBar from "../components/SearchBar";
import { isTransactionSortKey } from "../utils/transactionSort";
import { categoryContains } from "../utils/categoryContains";
import { getTransactionCurrency } from "../utils/customCategories";
import { TRANSACTION_PAGE_SIZE } from "../utils/transactionsPagination";
import { selectScopedTransactions, selectTransactionCards } from "../utils/transactionsPageView";
import TransactionForm from "../components/TransactionForm";
import AdvertisementContainer from "../components/AdvertisementContainer";
import QuickAccessCard from "../components/QuickAccessCard";
import TransactionsHeaderActions from "../components/TransactionsHeaderActions";
import { TRANSACTIONS_PAGE_COPY } from "../shared/constants/transactionsPageCopy";
import FinancialOverviewPanel from "../components/FinancialOverviewPanel";
import TransactionsExportReady from "../components/TransactionsExportReady";
import CategoryManager from "../components/CategoryManager";
import { buildTransactionOverview, buildTransactionsLitaMarkdown, prepareTransactionsExport } from "../utils/transactionsExport";
import { toast } from "react-toastify";
import CollapsibleSection from "../components/CollapsibleSection";
import kavakAd from "../imgs/ads/kavakAd.jpg";
import cocacolaAd from "../imgs/ads/cocaColaAd.jpg";
import cbseAd from "../imgs/ads/cbseAd.jpg";
import lotoAd from "../imgs/ads/lotoAd.jpg";
import cotoAd from "../imgs/ads/cotoAd.png";
import eyeHide from "../imgs/eyeHide.svg";
import closeEye from "../imgs/closeEye.svg";

import { INGRESO_DIVISAS_CATEGORY } from "../shared/constants/category.const";
import ChartViewer from "../components/ChartViewer";
import SpendingMapChart from "../components/SpendingMapChart";
import SpendingInsightsChart from "../components/SpendingInsightsChart";
import IncomeChartWrapper from "../components/IncomeChartWrapper";
import DivisasChartWrapper from "../components/DivisasChartWrapper";
import IncomeExpenseLineChart from "../components/IncomeExpenseLineChart";
import IngresoDivisasLineChart from "../components/IngresoDivisasLineChart";

const SkeletonBlock = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`rounded bg-slate-200 dark:bg-slate-700 ${className}`}
  />
);

const ChartSkeleton = () => (
  <div className="w-full animate-pulse" aria-label="Cargando gráfico">
    <SkeletonBlock className="h-5 w-36" />
    <SkeletonBlock className="mt-4 h-52 w-full rounded-xl" />
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {[0, 1, 2, 3].map((item) => (
        <SkeletonBlock key={item} className="h-9 w-20 rounded-lg" />
      ))}
    </div>
  </div>
);

const TransactionListSkeleton = () => (
  <div className="mt-4 space-y-3 animate-pulse" aria-label="Cargando transacciones">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-2/3 max-w-56" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
          <SkeletonBlock className="h-6 w-24 shrink-0" />
        </div>
        <div className="mt-4 flex gap-2">
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

const TransactionsPageSkeleton = () => (
  <main className="min-h-screen max-w-full bg-slate-50 px-3 py-5 dark:bg-gray-900 sm:px-5 lg:px-8"
    aria-label="Cargando panel de transacciones">
    <div className="mx-auto w-full max-w-7xl animate-pulse">
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="mt-3 h-8 w-72 max-w-[80%]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        <SkeletonBlock className="mt-5 h-11 w-44 rounded-xl" />
      </section>
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-3 h-6 w-56 max-w-full" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
          <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6 lg:col-span-2 lg:row-span-2">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="mt-2 h-8 w-44" />
          <SkeletonBlock className="mt-4 h-11 w-full rounded-xl" />
          <TransactionListSkeleton />
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ChartSkeleton />
        </section>
      </div>
    </div>
  </main>
);

const WeekdaySpendingView = (props) => <SpendingInsightsChart {...props} kind='weekday'/>;
const MerchantSpendingView = (props) => <SpendingInsightsChart {...props} kind='merchant'/>;

function Dashboard() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const paymentData = useSelector((state) => state.database.paymentData);
  const isFetching = useSelector((state) => state.auth.isFetching);
  const isDataFetching = useSelector((state) => state.database.isDataFetching);
  const docs = useSelector((state) => state.database.docs);
  const categories = useSelector((state) => state.database.categories);
  const selectedFilter = useSelector((state) => state.database.selectedFilter);
  const isFilterChanging = useSelector((state) => state.database.isFilterChanging);
  const [selectedPeriodInfo, setSelectedPeriodInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTION_PAGE_SIZE);
  const [preparedExport, setPreparedExport] = useState(null);
  const preparedExportRef = useRef(null);
  const clearPreparedExport = useCallback(() => {
    const old = preparedExportRef.current;
    preparedExportRef.current = null;
    setPreparedExport(null);
    if (old) {
      URL.revokeObjectURL(old.xlsxUrl);
      URL.revokeObjectURL(old.csvUrl);
    }
  }, []);


  const filteredDocs = useMemo(
    () => selectScopedTransactions(docs, categories, {
      query: searchQuery, category: searchCategory, type: searchType,
    }),
    [docs, categories, searchQuery, searchCategory, searchType]
  );

  // Do not offer stale financial exports after changing filters, data, or the
  // authenticated user. Also free object URLs on unmount.
  useEffect(() => {
    clearPreparedExport();
  }, [user?.uid, selectedFilter, searchQuery, searchCategory, searchType, filteredDocs, clearPreparedExport]);
  useEffect(() => () => {
    const current = preparedExportRef.current;
    if (current) {
      URL.revokeObjectURL(current.xlsxUrl);
      URL.revokeObjectURL(current.csvUrl);
      preparedExportRef.current = null;
    }
  }, []);

  // Sort only the visible cards, after filtering, before mobile pagination.
  // KPIs, balances, Lita and export keep the unmodified full filtered set.
  const visibleTransactions = useMemo(
    () => selectTransactionCards(filteredDocs, {
      sortBy, sortDirection, count: visibleTransactionCount,
    }),
    [filteredDocs, sortBy, sortDirection, visibleTransactionCount]
  );
  useEffect(() => {
    setVisibleTransactionCount(TRANSACTION_PAGE_SIZE);
  }, [user?.uid, selectedFilter, searchQuery, searchCategory, searchType, sortBy, sortDirection]);

  const hasActiveSearch = Boolean(searchQuery.trim() || searchCategory || searchType !== "all");
  const clearTransactionFilters = () => {
    setSearchQuery("");
    setSearchCategory("");
    setSearchType("all");
  };
  const viewAllTransactions = async () => {
    if (!user?.uid) return;
    // The date buttons own the reporting scope. An explicit click is required
    // before expanding the search to all historical transactions.
    dispatch(setSelectedFilter("total"));
    await dispatch(getTotalBalance(user.uid));
  };

  const [income, setIncome] = useState(0);
  const [currencyIncome, setCurrencyIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [total, setTotal] = useState(0);

  const [edit, setEdit] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [expenseId, setExpenseId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState("ARS");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("");
  const [customDetails, setCustomDetails] = useState({});
  const [transactionLocation, setTransactionLocation] = useState(null);
  const [hasSavedCustomDetails, setHasSavedCustomDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const [isCreditCardCategory, setIsCreditCardCategory] = useState(false);
  const [selectedExpirationDate, setSelectedExpirationDate] = useState("");
  const [selectedCloseDate, setSelectedCloseDate] = useState("");

  const [isBuyCurrenciesCategory, setIsBuyCurrenciesCategory] = useState(false);
  const [currencyQuantity, setCurrencyQuantity] = useState();
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState();
  const [currencySale, setCurrencySale] = useState(0);

  const [isDataVisible, setIsDataVisible] = useState(true);

  const [isCurrencyIncomeCategory, setIsCurrencyIncomeCategory] =
    useState(false);

  const [isSellCurrenciesCategory, setIsSellCurrenciesCategory] =
    useState(false);
  const [currencySellQuantity, setCurrencySellQuantity] = useState();
  const [currencySellRate, setCurrencySellRate] = useState();

  const [isOpen, setIsOpen] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [selectedChart, setSelectedChart] = useState("expenses");
  const transactionPreferenceKey = user?.uid
    ? `ltc:transactions:view:${user.uid}`
    : "ltc:transactions:view";
  const [collapsedSections, setCollapsedSections] = useState({
    overview: false,
    summary: false,
    charts: true,
    transactions: false,
    filters: true,
  });

  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState(null);
  useEffect(() => {
    setPreferencesLoadedFor(null);
    if (!user?.uid) return;
    try {
      const saved = JSON.parse(localStorage.getItem(transactionPreferenceKey) || "{}");
      setCollapsedSections({
        overview: false,
        summary: false,
        charts: true,
        transactions: false,
        filters: true,
        ...(saved.collapsedSections || {}),
      });
      setIsDataVisible(typeof saved.isDataVisible === "boolean"
        ? saved.isDataVisible
        : true);
      setSortBy(isTransactionSortKey(saved.sortBy) ? saved.sortBy : "date");
      setSortDirection(saved.sortDirection === "asc" ? "asc" : "desc");
    } catch {
      setCollapsedSections({ overview: false, summary: false, charts: true, transactions: false, filters: true });
      setIsDataVisible(true);
      setSortBy("date");
      setSortDirection("desc");
    }
    setPreferencesLoadedFor(user.uid);
  }, [user?.uid, transactionPreferenceKey]);

  useEffect(() => {
    if (!user?.uid || preferencesLoadedFor !== user.uid) return;
    try {
      localStorage.setItem(
        transactionPreferenceKey,
        JSON.stringify({ collapsedSections, isDataVisible, sortBy, sortDirection })
      );
    } catch {
      // Browsers can disable local storage; the UI still works in memory.
    }
  }, [user?.uid, preferencesLoadedFor, transactionPreferenceKey, collapsedSections, isDataVisible, sortBy, sortDirection]);

  const toggleDashboardSection = (section) =>
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));

  const toggleDataVisibility = () => {
    setIsDataVisible((current) => !current);
  };

  const handleChartToggle = (chart) => {
    setSelectedChart(chart);
  };

  const advertisements = [kavakAd, cocacolaAd, cbseAd, lotoAd, cotoAd];
  const adFreeUsers = (process.env.REACT_APP_AD_FREE_USERS || "").toLowerCase().split(",").map((value) => value.trim()).filter(Boolean);
  const shouldShowAds = !paymentData && !adFreeUsers.includes(user?.email?.toLowerCase());

  const chartComponents = {
    expenses: BarChartWrapper,
    income: IncomeChartWrapper,
    divisas: DivisasChartWrapper,
    incomesVsExpenses: IncomeExpenseLineChart,
    ingresoDivisas: IngresoDivisasLineChart,
    spendingMap: SpendingMapChart,
    weekdays: WeekdaySpendingView,
    merchants: MerchantSpendingView,
  };

  useEffect(() => {
    setSearchQuery("");
    setSearchCategory("");
    setSearchType("all");
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return dispatch(getCategoriesDataAction(user.uid));
  }, [user?.uid, dispatch]);

  useEffect(() => {
    // Subscribe only for the default current-month view. Previous versions
    // accumulated listeners each time Portfolio -> Transacciones was visited,
    // and those listeners could overwrite "Todo" period results after navigation.
    if (!user?.uid || selectedFilter !== "month") return undefined;
    return dispatch(getDataAction(user.uid));
  }, [user?.uid, selectedFilter, dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(getPaymentDataAction(user.uid));
    }
  }, [dispatch, user]);

  useEffect(() => {
    setExpense(0);
    setIncome(0);

    if (docs && categories) {
      const expensesCategories = categories
        ?.filter((category) => category.isExpense)
        ?.map((category) => category.name);

      const expenses = filteredDocs
        .filter((doc) => expensesCategories?.includes(doc?.category) && getTransactionCurrency(doc) === 'ARS')
        .map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

      const incomes = filteredDocs
        .filter((doc) => !expensesCategories?.includes(doc?.category) && getTransactionCurrency(doc) === 'ARS')
        .map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

      const currencyIncome = filteredDocs
        .filter(
          (doc) =>
            categoryContains(doc, "Compra divisas") ||
            categoryContains(doc, INGRESO_DIVISAS_CATEGORY)
        )
        .map((doc) => {
          const currencyQuantity = parseFloat(doc?.currencyQuantity);
          return isNaN(currencyQuantity) ? 0 : currencyQuantity;
        });

      const currencySale = filteredDocs
        .filter((doc) => categoryContains(doc, "Venta divisas"))
        .map((doc) => {
          const currencyQuantity = parseFloat(doc?.currencyQuantity);
          return isNaN(currencyQuantity) ? 0 : currencyQuantity;
        });

      setExpense(
        expenses?.reduce((acc, item) => acc + item, 0) * -(1).toFixed(2)
      );

      setIncome(incomes?.reduce((acc, item) => acc + item, 0).toFixed(2));

      // Calculate currencyIncome minus currencySale
      const netCurrencyIncome =
        currencyIncome?.reduce((acc, item) => acc + item, 0) -
        currencySale?.reduce((acc, item) => acc + item, 0);

      setCurrencyIncome(netCurrencyIncome.toFixed(2));

      setCurrencySale(
        currencySale?.reduce((acc, item) => acc + item, 0).toFixed(2)
      );

      setTotal(
        incomes?.reduce((acc, item) => acc + item, 0).toFixed(2) -
          expenses?.reduce((acc, item) => acc + item, 0).toFixed(2)
      );
    }
  }, [filteredDocs, categories]);

  const overview = useMemo(
    () => buildTransactionOverview(filteredDocs, categories || []),
    [filteredDocs, categories]
  );

  const litaTransactionContext = useMemo(
    () => ({
      scope: "current-view",
      spendingByCategory: summarizeSpendingByCategory(filteredDocs, categories || []),
      categories: (categories || []).filter((entry) => entry.active !== false)
        .map(({ name, isExpense, currency }) => ({ name, isExpense: Boolean(isExpense), currency: currency === 'USD' ? 'USD' : 'ARS' })),
      summary: {
        incomeArs: Number(income || 0),
        expensesArs: Number(expense || 0),
        balanceArs: Number(total || 0),
        investmentUsd: Number(currencyIncome || 0),
      },
      transactions: filteredDocs.slice(0, 50).map((doc) => ({
        name: doc.expenseName || "",
        category: doc.category || "",
        amount: Number(doc.amount || 0),
        transactionCurrency: getTransactionCurrency(doc),
        selectedDate: doc.selectedDate || "",
        comment: doc.comment || "",
        currencyQuantity: Number(doc.currencyQuantity || 0),
        currencyExchangeRate: Number(doc.currencyExchangeRate || 0),
      })),
    }),
    [categories, currencyIncome, filteredDocs, expense, income, total]
  );

  useEffect(() => {
    const transactionId = location.state?.transactionId;
    if (!location.state?.openEditor || !transactionId || !docs?.length) return;

    const transaction = docs.find((doc) => doc.id === transactionId);
    if (!transaction) return;

    setName(transaction.expenseName || "");
    setAmount(transaction.amount ?? "");
    setTransactionCurrency(transaction.transactionCurrency === "USD" ? "USD" : "ARS");
    setComment(transaction.comment || "");
    setCategory(transaction.category || "");
    setCustomDetails(transaction.customDetails || {});
    setTransactionLocation(transaction.location || null);
    setHasSavedCustomDetails(Boolean(Object.keys(transaction.customDetails || {}).length));
    setSelectedDate(transaction.selectedDate || "");
    setSelectedExpirationDate(transaction.selectedExpirationDate || "");
    setSelectedCloseDate(transaction.selectedCloseDate || "");
    setCurrencyQuantity(transaction.currencyQuantity ?? "");
    setCurrencyExchangeRate(transaction.currencyExchangeRate ?? "");
    setCurrencySellQuantity(transaction.currencySellQuantity ?? "");
    setCurrencySellRate(transaction.currencySellRate ?? "");

    const transactionCategory = transaction.category || "";
    setIsCreditCardCategory(transactionCategory.includes("Resumen tarjeta"));
    setIsBuyCurrenciesCategory(transactionCategory.includes("Compra divisas"));
    setIsCurrencyIncomeCategory(
      transactionCategory.includes(INGRESO_DIVISAS_CATEGORY)
    );
    setIsSellCurrenciesCategory(transactionCategory.includes("Venta divisas"));
    setExpenseId(transaction.id);
    setEdit(true);
    setCollapsedSections((current) => ({
      ...current,
      transactions: false,
    }));
    setIsOpen(true);

    navigate("/transacciones", { replace: true, state: null });
  }, [docs, location.state, navigate]);

  if (user === null) return <Navigate to="/" />;

  if (isFetching) return <TransactionsPageSkeleton />;

  const handleFloatingButtonClick = () => {
    setShowModal(true);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const downloadFilteredTransactions = () => {
    if (isDataFetching || isFilterChanging || !filteredDocs.length) return;
    try {
      const files = prepareTransactionsExport(filteredDocs, categories || [], {
        period: selectedFilter,
        periodLabel: selectedPeriodInfo?.key === selectedFilter
          ? selectedPeriodInfo.label
          : describeSelectedPeriod(selectedFilter, new Date()),
        query: searchQuery,
        category: searchCategory,
        type: searchType,
      });
      const xlsxUrl = URL.createObjectURL(files.xlsxBlob);
      let csvUrl;
      try {
        csvUrl = URL.createObjectURL(files.csvBlob);
      } catch (error) {
        URL.revokeObjectURL(xlsxUrl);
        throw error;
      }
      // The browser gives us no API to know whether a silent .click()
      // actually saved a file. Keep native links on-screen until the user
      // taps one, closes the panel, or changes the filters.
      clearPreparedExport();
      const prepared = {
        ...files, xlsxUrl, csvUrl,
        // Retain the exact filtered view for an optional on-demand private PDF.
        pdfSource: { docs: filteredDocs, categories: categories || [], filters: {
          period: selectedFilter,
          periodLabel: selectedPeriodInfo?.key === selectedFilter
            ? selectedPeriodInfo.label
            : describeSelectedPeriod(selectedFilter, new Date()),
          query: searchQuery,
          category: searchCategory,
          type: searchType,
        } },
      };
      preparedExportRef.current = prepared;
      setPreparedExport(prepared);
    } catch (error) {
      console.error('[ltc-excel] No se pudo preparar el archivo', error);
      toast.error('No se pudo preparar el archivo. Volvé a intentarlo.');
    }
  };

  const copyTransactionsForLita = async () => {
    if (!filteredDocs?.length) return;
    try {
      await navigator.clipboard.writeText(
        buildTransactionsLitaMarkdown(filteredDocs, categories || [])
      );
      toast.success("Markdown listo para pegar en Lita");
    } catch (error) {
      toast.error("No se pudo copiar el Markdown");
    }
  };

  const closeModal = () => {
    setEdit(false);
    setName("");
    setAmount("");
    setTransactionCurrency("ARS");
    setComment("");
    setCategory("");
    setCustomDetails({});
    setTransactionLocation(null);
    setHasSavedCustomDetails(false);
    setSelectedDate("");
    setSelectedExpirationDate("");
    setSelectedCloseDate("");
    setCurrencyQuantity("");
    setCurrencyExchangeRate("");
    setIsBuyCurrenciesCategory(false);
    setIsSellCurrenciesCategory(false);
    setIsCreditCardCategory(false);
    setIsCurrencyIncomeCategory(false);
    setIsOpen(false);
  };

  return (
    <>
      <div
        id="dashboard"
        className="min-h-screen max-w-full bg-slate-50 dark:bg-gray-900 dark:text-zinc-100 px-3 sm:px-5 lg:px-8 py-5"
      >
        <div className="max-w-7xl mx-auto w-full">
          <QuickAccessCard
            eyebrow={TRANSACTIONS_PAGE_COPY.hero.eyebrow}
            title={TRANSACTIONS_PAGE_COPY.hero.title}
            description={TRANSACTIONS_PAGE_COPY.hero.description}
            actionsClassName="min-w-0 sm:shrink-0"
          >
            <TransactionsHeaderActions
              onAdd={openModal}
              valuesVisible={isDataVisible}
              onTogglePrivacy={toggleDataVisibility}
              visibleIcon={eyeHide}
              hiddenIcon={closeEye}
            />
          </QuickAccessCard>
          <section id="transactions-scope" aria-label="Período, búsqueda y filtros de movimientos"
            className="mb-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">Qué movimientos estás viendo</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
                El período, la búsqueda y los filtros se aplican a la lista, los resúmenes, los gráficos, Lita y las exportaciones. El orden solo afecta la lista.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(245px,0.9fr)_minmax(0,1.7fr)]">
              <div className="min-w-0">
                <ExpenseFilter onPeriodChange={setSelectedPeriodInfo} />
              </div>
              <div className="min-w-0">
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              selectedCategory={searchCategory}
              onCategoryChange={setSearchCategory}
              transactionType={searchType}
              onTypeChange={setSearchType}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortDirection={sortDirection}
              onSortDirectionChange={setSortDirection}
              collapsed={collapsedSections.filters}
              onToggle={() => toggleDashboardSection("filters")}
              categories={categories || []}
              resultCount={filteredDocs.length}
              totalCount={(docs || []).length}
              selectedFilter={selectedFilter}
              periodDescription={selectedPeriodInfo?.key === selectedFilter
                ? selectedPeriodInfo.label
                : describeSelectedPeriod(selectedFilter, new Date())}
              onClear={clearTransactionFilters}
              onManageCategories={() => setShowCategoryManager(true)}
              onViewAll={viewAllTransactions}
              disabled={isDataFetching || isFilterChanging}
            />
              </div>
            </div>
          </section>
          {isDataFetching && !docs ? (
            <PageDataSkeleton variant="transactions" />
          ) : (
          <div className="grid min-w-0 grid-cols-1 gap-5 items-start lg:grid-cols-3">
        <div
          id="left"
          className="flex w-full min-w-0 max-w-full flex-col items-stretch"
        >
          <CollapsibleSection
            id="transactions-summary"
            eyebrow={TRANSACTIONS_PAGE_COPY.summary.eyebrow}
            title={TRANSACTIONS_PAGE_COPY.summary.title}
            collapsed={collapsedSections.summary}
            onToggle={() => toggleDashboardSection("summary")}
            className="mb-5 font-Nunito"
          >
            <BimonetarySummary
              docs={filteredDocs}
              categories={categories}
              userId={user?.uid}
              isLoading={isDataFetching}
              hideValues={!isDataVisible}
            />
          </CollapsibleSection>
        </div>

        <CollapsibleSection
          id="transactions-list"
          eyebrow="Actividad"
          title="Transacciones"

          collapsed={collapsedSections.transactions}
          onToggle={() => toggleDashboardSection("transactions")}
          className="min-w-0 lg:col-span-2 lg:row-span-2"
        >


            {isDataFetching ? (
              <TransactionListSkeleton />
            ) : !docs?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200" role="status">
                <p className="font-semibold text-slate-900 dark:text-slate-50">No hay movimientos en este período</p>
                <p className="mt-1">Probá con otro período o consultá todo el historial.</p>
                {selectedFilter !== "total" && (
                  <button type="button" onClick={viewAllTransactions}
                    className="mt-4 min-h-11 rounded-xl border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-violet-500/10">
                    Ver todo el historial
                  </button>
                )}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-900/50" role="status">
                <p className="font-bold text-slate-900 dark:text-slate-100">No encontramos movimientos</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Los resúmenes, gráficos y Lita también usan los filtros activos. Probá otra categoría o consultá todo el historial.
                </p>
                {hasActiveSearch && (
                  <button type="button" onClick={clearTransactionFilters}
                    className="mt-4 min-h-[44px] rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : null}

            {!isDataFetching && visibleTransactions.map((doc) => {
              return (
                <div key={doc.id}>
                  <Card
                    id={doc.id}
                    hideValues={!isDataVisible}
                    name={doc.expenseName}
                    amount={doc.amount}
                    transactionCurrency={doc.transactionCurrency}
                    setTransactionCurrency={setTransactionCurrency}
                    date={doc.date}
                    comment={doc.comment}
                    category={doc.category}
                    customDetails={doc.customDetails || {}}
                    location={doc.location || null}
                    setTransactionLocation={setTransactionLocation}
                    setCustomDetails={setCustomDetails}
                    setHasSavedCustomDetails={setHasSavedCustomDetails}
                    selectedDate={doc.selectedDate}
                    selectedExpirationDate={doc.selectedExpirationDate}
                    selectedCloseDate={doc.selectedCloseDate}
                    currencyExchangeRate={doc.currencyExchangeRate}
                    currencyQuantity={doc.currencyQuantity}
                    currencySellQuantity={doc.currencySellQuantity}
                    paymentStatus={doc.paymentStatus}
                    paidAt={doc.paidAt}
                    paidDueDate={doc.paidDueDate}
                    setExpense={setExpense}
                    setIncome={setIncome}
                    setName={setName}
                    setAmount={setAmount}
                    setComment={setComment}
                    setCategory={setCategory}
                    setIsCreditCardCategory={setIsCreditCardCategory}
                    setIsBuyCurrenciesCategory={setIsBuyCurrenciesCategory}
                    setIsCurrencyIncomeCategory={setIsCurrencyIncomeCategory}
                    setIsSellCurrenciesCategory={setIsSellCurrenciesCategory}
                    setCurrencySellQuantity={setCurrencySellQuantity}
                    setCurrencySellRate={setCurrencySellRate}
                    setSelectedDate={setSelectedDate}
                    setSelectedExpirationDate={setSelectedExpirationDate}
                    setSelectedCloseDate={setSelectedCloseDate}
                    setCurrencyQuantity={setCurrencyQuantity}
                    setCurrencyExchangeRate={setCurrencyExchangeRate}
                    setEdit={setEdit}
                    setExpenseId={setExpenseId}
                    categories={categories}
                    openModal={openModal}
                    onRequestDelete={setPendingDelete}
                  />
                </div>
              );
            })}
            {!isDataFetching && visibleTransactions.length < filteredDocs.length && (
              <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
                  Mostrando {visibleTransactions.length} de {filteredDocs.length} movimientos
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleTransactionCount((count) => count + TRANSACTION_PAGE_SIZE)}
                  className="min-h-[44px] rounded-xl border border-purple-500/60 bg-purple-500/10 px-5 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-purple-300"
                >
                  Cargar más movimientos
                </button>
              </div>
            )}
        </CollapsibleSection>

        <div className="min-w-0 lg:col-span-1" id="transactions-secondary-visualizations">
          <CollapsibleSection
            id="transactions-charts"
            eyebrow="Visualización"
            title="Gráficos"

            collapsed={collapsedSections.charts}
            onToggle={() => toggleDashboardSection("charts")}
            className="mb-5 min-w-0 max-w-full overflow-hidden font-Nunito"
            contentClassName="min-w-0 max-w-full"
          >
            {isDataFetching || !Array.isArray(categories) ? (
              <ChartSkeleton />
            ) : (
              docs && (
                <>
                  <ChartViewer
                    selectedChart={selectedChart}
                    onSelect={handleChartToggle}
                    chartComponents={chartComponents}
                    chartData={filteredDocs}
                    categories={categories}
                    hideValues={!isDataVisible}
                  />
                </>
              )
            )}
          </CollapsibleSection>
          {!paymentData && user?.email?.toLowerCase() !== "ffunes90@gmail.com" ? (
            <AdvertisementContainer advertisements={advertisements} />
          ) : (
            ""
          )}
        </div>

          </div>
          )}
          <FinancialOverviewPanel
              id="transactions-overview"
              collapsed={collapsedSections.overview}
              onToggle={() => toggleDashboardSection("overview")}
              title={TRANSACTIONS_PAGE_COPY.overview.title}
              eyebrow={TRANSACTIONS_PAGE_COPY.overview.eyebrow}
              privacyHidden={!isDataVisible}
              isLoading={isDataFetching || !docs || !categories}
              actions={[
                { id: "excel", type: "excel", label: "Exportar archivos", onClick: downloadFilteredTransactions, disabled: isDataFetching || isFilterChanging || !filteredDocs.length },
                { id: "markdown", type: "markdown", label: "Copiar para Lita", onClick: copyTransactionsForLita, disabled: isDataFetching || !filteredDocs.length },
              ]}
              metrics={[
                { id: "count", icon: FaListAlt, label: TRANSACTIONS_PAGE_COPY.metrics.count, value: isDataVisible ? overview.count : "••" },
                { id: "categories", icon: FaTags, label: TRANSACTIONS_PAGE_COPY.metrics.categories, value: isDataVisible ? overview.categoryCount : "••" },
                { id: "due", icon: FaRegCalendarCheck, label: TRANSACTIONS_PAGE_COPY.metrics.due, value: isDataVisible ? overview.dueCount : "••" },
              ]}
            />
        </div>
      </div>


      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2, type: "tween" }}
      >
        <FloatingMenu
          openTransactionModal={openModal}
          openLitaModal={handleFloatingButtonClick}
          isModalOpen={isOpen || showModal || Boolean(pendingDelete)}
        />

        {pendingDelete && (
          <DeleteTransactionDialog
            transaction={pendingDelete}
            onClose={() => setPendingDelete(null)}
            onDelete={(transactionId) => dispatch(deleteCardAction(transactionId))}
          />
        )}

        {isOpen && (
          <GenericModal
            component={TransactionForm}
            name={name}
            amount={amount}
            transactionCurrency={transactionCurrency}
            setTransactionCurrency={setTransactionCurrency}
            edit={edit}
            comment={comment}
            category={category}
            customDetails={customDetails}
            setCustomDetails={setCustomDetails}
            transactionLocation={transactionLocation}
            setTransactionLocation={setTransactionLocation}
            hasSavedCustomDetails={hasSavedCustomDetails}
            selectedDate={selectedDate}
            selectedExpirationDate={selectedExpirationDate}
            selectedCloseDate={selectedCloseDate}
            currencyExchangeRate={currencyExchangeRate}
            currencySellRate={currencySellRate}
            currencyQuantity={currencyQuantity}
            currencySellQuantity={currencySellQuantity}
            isCreditCardCategory={isCreditCardCategory}
            isBuyCurrenciesCategory={isBuyCurrenciesCategory}
            isCurrencyIncomeCategory={isCurrencyIncomeCategory}
            isSellCurrenciesCategory={isSellCurrenciesCategory}
            expenseId={expenseId}
            categories={categories}
            onManageCategories={() => { if (categories) setShowCategoryManager(true); }}
            closeModal={() => { if (!showCategoryManager) closeModal(); }}
            show={isOpen}
            setEdit={setEdit}
            setExpense={setExpense}
            setExpenseId={setExpenseId}
            setIncome={setIncome}
            setName={setName}
            setAmount={setAmount}
            setComment={setComment}
            setCategory={setCategory}
            setIsCreditCardCategory={setIsCreditCardCategory}
            setIsBuyCurrenciesCategory={setIsBuyCurrenciesCategory}
            setIsSellCurrenciesCategory={setIsSellCurrenciesCategory}
            setIsCurrencyIncomeCategory={setIsCurrencyIncomeCategory}
            setSelectedDate={setSelectedDate}
            setSelectedExpirationDate={setSelectedExpirationDate}
            setSelectedCloseDate={setSelectedCloseDate}
            setCurrencyQuantity={setCurrencyQuantity}
            setCurrencySellQuantity={setCurrencySellQuantity}
            setCurrencyExchangeRate={setCurrencyExchangeRate}
            setIsOpen={setIsOpen}
          />
        )}


        {showCategoryManager && (
          <GenericModal
            component={CategoryManager}
            show={showCategoryManager}
            userId={user?.uid}
            categories={categories || []}
            onCreated={isOpen ? (newCategoryName) => {
              setCategory(newCategoryName);
              setCustomDetails({});
              setIsCreditCardCategory(false);
              setIsBuyCurrenciesCategory(false);
              setIsCurrencyIncomeCategory(false);
              setIsSellCurrenciesCategory(false);
              setShowCategoryManager(false);
            } : undefined}
            closeModal={() => setShowCategoryManager(false)}
          />
        )}

        {showModal && (
          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5, type: "tween" }}
          >
            <LitaAssistantPanel
              isOpen={showModal}
              setIsOpen={setShowModal}
              section="transactions"
              context={litaTransactionContext}
            />
          </motion.div>
        )}
      </motion.div>
      {/* The export is a fixed overlay, not another collapsible dashboard widget. */}
      <TransactionsExportReady prepared={preparedExport} onClose={clearPreparedExport} />
    </>
  );
}

export default Dashboard;
