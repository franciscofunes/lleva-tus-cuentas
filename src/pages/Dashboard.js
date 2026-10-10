import { motion } from "framer-motion";
import PageDataSkeleton from "../components/PageDataSkeleton";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import "tippy.js/dist/tippy.css";
import { FaArrowRight, FaChartPie, FaExchangeAlt, FaPlus, FaListAlt, FaTags, FaRegCalendarCheck } from "react-icons/fa";
import {
  getCategoriesDataAction,
  getDataAction,
  getPaymentDataAction,
  getTotalBalance,
  setSelectedFilter,
} from "../actionCreators/databaseActions";
import BarChartWrapper from "../components/BarChartWrapper";
import Card from "../components/Card";
import ExpenseFilter, { describeSelectedPeriod } from "../components/ExpenseFilter";
import BimonetarySummary from "../components/BimonetarySummary";
import FloatingMenu from "../components/FloatingMenu";
import GenericModal from "../components/GenericModal";
import LitaAssistantPanel from "../components/LitaAssitantPanel";
import { summarizeSpendingByCategory } from '../utils/litaSpendingSummary';
import SearchBar from "../components/SearchBar";
import { filterTransactions } from "../utils/transactionSearch";
import { categoryContains } from "../utils/categoryContains";
import { TRANSACTION_PAGE_SIZE, visibleTransactionBatch } from "../utils/transactionsPagination";
import TransactionForm from "../components/TransactionForm";
import AdvertisementContainer from "../components/AdvertisementContainer";
import QuickAccessCard from "../components/QuickAccessCard";
import FinancialOverviewPanel from "../components/FinancialOverviewPanel";
import CategoryManager from "../components/CategoryManager";
import { buildTransactionOverview, buildTransactionsLitaMarkdown, exportTransactionsXlsx } from "../utils/transactionsExport";
import { toast } from "react-toastify";
import CollapsibleSection from "../components/CollapsibleSection";
import kavakAd from "../imgs/ads/kavakAd.jpg";
import cocacolaAd from "../imgs/ads/cocaColaAd.jpg";
import cbseAd from "../imgs/ads/cbseAd.jpg";
import lotoAd from "../imgs/ads/lotoAd.jpg";
import cotoAd from "../imgs/ads/cotoAd.png";
import eyeHide from "../imgs/eyeHide.svg";
import closeEye from "../imgs/closeEye.svg";

import AppFooter from "../components/AppFooter";
import { INGRESO_DIVISAS_CATEGORY } from "../shared/constants/category.const";
import ChartViewer from "../components/ChartViewer";
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
  <main
    className="min-h-screen max-w-full bg-slate-50 dark:bg-gray-900 px-3 sm:px-5 lg:px-8 py-5"
    aria-label="Cargando panel de transacciones"
  >
    <div className="max-w-7xl mx-auto w-full animate-pulse">
      <section className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm">
        <SkeletonBlock className="h-4 w-48" />
        <SkeletonBlock className="mt-3 h-8 w-72 max-w-[80%]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-5 grid grid-cols-3 gap-2 sm:flex">
          {[0, 1, 2].map((item) => (
            <SkeletonBlock key={item} className="h-11 sm:w-32 rounded-xl" />
          ))}
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5 items-start lg:grid-cols-3">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-5">
              {[0, 1].map((item) => (
                <div key={item} className="flex flex-col items-center">
                  <SkeletonBlock className="h-6 w-24" />
                  <SkeletonBlock className="mt-3 h-5 w-28" />
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center">
              <SkeletonBlock className="h-6 w-28" />
              <SkeletonBlock className="mt-3 h-5 w-28" />
              <SkeletonBlock className="mt-5 h-5 w-20" />
              <SkeletonBlock className="mt-3 h-8 w-40" />
            </div>
            <SkeletonBlock className="mt-6 h-10 w-full rounded-xl" />
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <ChartSkeleton />
          </section>
        </div>

        <section className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="mt-2 h-8 w-44" />
          <SkeletonBlock className="mt-4 h-11 w-full rounded-xl" />
          <TransactionListSkeleton />
        </section>
      </div>
    </div>
  </main>
);

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
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTION_PAGE_SIZE);

  const filteredDocs = useMemo(
    () => filterTransactions(docs || [], {
      query: searchQuery,
      category: searchCategory,
      type: searchType,
      categories: categories || [],
    }),
    [docs, searchQuery, searchCategory, searchType, categories]
  );

  // Only render the first batch of cards. Filtering, KPIs, Lita context and
  // exports still use the complete result set; rendering thousands of rich
  // cards on a route transition can freeze Android Chrome.
  const visibleTransactions = useMemo(
    () => visibleTransactionBatch(filteredDocs, visibleTransactionCount),
    [filteredDocs, visibleTransactionCount]
  );
  useEffect(() => {
    setVisibleTransactionCount(TRANSACTION_PAGE_SIZE);
  }, [user?.uid, selectedFilter, searchQuery, searchCategory, searchType]);

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

  const [expenseId, setExpenseId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("");
  const [customDetails, setCustomDetails] = useState({});
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
    charts: false,
    transactions: false,
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
        charts: false,
        transactions: false,
        ...(saved.collapsedSections || {}),
      });
      setIsDataVisible(typeof saved.isDataVisible === "boolean"
        ? saved.isDataVisible
        : true);
    } catch {
      setCollapsedSections({ overview: false, summary: false, charts: false, transactions: false });
      setIsDataVisible(true);
    }
    setPreferencesLoadedFor(user.uid);
  }, [user?.uid, transactionPreferenceKey]);

  useEffect(() => {
    if (!user?.uid || preferencesLoadedFor !== user.uid) return;
    try {
      localStorage.setItem(
        transactionPreferenceKey,
        JSON.stringify({ collapsedSections, isDataVisible })
      );
    } catch {
      // Browsers can disable local storage; the UI still works in memory.
    }
  }, [user?.uid, preferencesLoadedFor, transactionPreferenceKey, collapsedSections, isDataVisible]);

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

      const expenses = docs
        .filter((doc) => expensesCategories?.includes(doc?.category))
        .map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

      const incomes = docs
        .filter((doc) => !expensesCategories?.includes(doc?.category))
        .map((doc) => !isNaN(doc?.amount) && parseFloat(doc?.amount));

      const currencyIncome = docs
        .filter(
          (doc) =>
            categoryContains(doc, "Compra divisas") ||
            categoryContains(doc, INGRESO_DIVISAS_CATEGORY)
        )
        .map((doc) => {
          const currencyQuantity = parseFloat(doc?.currencyQuantity);
          return isNaN(currencyQuantity) ? 0 : currencyQuantity;
        });

      const currencySale = docs
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
  }, [docs, categories]);

  const overview = useMemo(
    () => buildTransactionOverview(filteredDocs, categories || []),
    [filteredDocs, categories]
  );

  const litaTransactionContext = useMemo(
    () => ({
      scope: "current-view",
      spendingByCategory: summarizeSpendingByCategory(docs || [], categories || []),
      categories: (categories || []).filter((entry) => entry.active !== false)
        .map(({ name, isExpense }) => ({ name, isExpense: Boolean(isExpense) })),
      summary: {
        incomeArs: Number(income || 0),
        expensesArs: Number(expense || 0),
        balanceArs: Number(total || 0),
        investmentUsd: Number(currencyIncome || 0),
      },
      transactions: (docs || []).slice(0, 50).map((doc) => ({
        name: doc.expenseName || "",
        category: doc.category || "",
        amount: Number(doc.amount || 0),
        selectedDate: doc.selectedDate || "",
        comment: doc.comment || "",
        currencyQuantity: Number(doc.currencyQuantity || 0),
        currencyExchangeRate: Number(doc.currencyExchangeRate || 0),
      })),
    }),
    [categories, currencyIncome, docs, expense, income, total]
  );

  useEffect(() => {
    const transactionId = location.state?.transactionId;
    if (!location.state?.openEditor || !transactionId || !docs?.length) return;

    const transaction = docs.find((doc) => doc.id === transactionId);
    if (!transaction) return;

    setName(transaction.expenseName || "");
    setAmount(transaction.amount ?? "");
    setComment(transaction.comment || "");
    setCategory(transaction.category || "");
    setCustomDetails(transaction.customDetails || {});
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
    setComment("");
    setCategory("");
    setCustomDetails({});
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
            eyebrow="Tu dinero, en un solo lugar"
            title="Resumen financiero"
            description="Movimientos, balance e inversiones con acceso rápido a lo que más usás."
          >
            <button type="button" onClick={openModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3 py-2.5 text-sm font-bold"><FaPlus /> <span className="hidden sm:inline">Movimiento</span></button>
            <Link to="/portfolio" className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500 text-purple-600 dark:text-purple-400 px-3 py-2.5 text-sm font-bold"><FaChartPie /> <span className="hidden sm:inline">Portfolio</span></Link>
            <button type="button" onClick={toggleDataVisibility} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-bold"><img className="h-5 w-5" src={isDataVisible ? eyeHide : closeEye} alt="" /> <span className="hidden sm:inline">{isDataVisible ? "Ocultar" : "Mostrar"}</span></button>
          </QuickAccessCard>
          <FinancialOverviewPanel
              id="transactions-overview"
              collapsed={collapsedSections.overview}
              onToggle={() => toggleDashboardSection("overview")}
              title="Movimientos de un vistazo"
              description="Métricas y exportaciones de los movimientos de la vista actual."
              privacyHidden={!isDataVisible}
              isLoading={isDataFetching || !docs || !categories}
              actions={[
                { id: "excel", type: "excel", label: "Exportar Excel", onClick: () => exportTransactionsXlsx(filteredDocs, categories || [], {
                  period: selectedFilter,
                  periodLabel: selectedPeriodInfo?.key === selectedFilter
                    ? selectedPeriodInfo.label
                    : describeSelectedPeriod(selectedFilter, new Date()),
                  query: searchQuery,
                  category: searchCategory,
                  type: searchType,
                }), disabled: isDataFetching || isFilterChanging || !filteredDocs.length },
                { id: "markdown", type: "markdown", label: "Copiar para Lita", onClick: copyTransactionsForLita, disabled: isDataFetching || !filteredDocs.length },
              ]}
              metrics={[
                { id: "count", icon: FaListAlt, label: "Movimientos", value: isDataVisible ? overview.count : "••" },
                { id: "categories", icon: FaTags, label: "Categorías", value: isDataVisible ? overview.categoryCount : "••" },
                { id: "due", icon: FaRegCalendarCheck, label: "Con vencimiento", value: isDataVisible ? overview.dueCount : "••" },
              ]}
            />
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
            eyebrow="Resumen"
            title="Tu economía en ARS y USD"
            description="Ingresos, conversiones y patrimonio, cada uno en su moneda."
            collapsed={collapsedSections.summary}
            onToggle={() => toggleDashboardSection("summary")}
            className="mb-5 font-Nunito"
          >
            <ExpenseFilter onPeriodChange={setSelectedPeriodInfo} />
            <BimonetarySummary
              docs={docs}
              categories={categories}
              userId={user?.uid}
              isLoading={isDataFetching}
              hideValues={!isDataVisible}
            />
          </CollapsibleSection>
          <CollapsibleSection
            id="transactions-charts"
            eyebrow="Visualización"
            title="Gráficos"
            description="Analizá tus movimientos con la visualización que prefieras."
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
                    chartData={docs}
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

        <CollapsibleSection
          id="transactions-list"
          eyebrow="Actividad"
          title="Transacciones"
          description="Buscá, revisá y editá tus movimientos."
          collapsed={collapsedSections.transactions}
          onToggle={() => toggleDashboardSection("transactions")}
          className="lg:col-span-2"
          action={
            <Link to="/portfolio" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-purple-500">
              Ver portfolio <FaArrowRight />
            </Link>
          }
        >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(true)}
                disabled={!categories}
                aria-label="Gestionar categorías personales"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-purple-400 hover:bg-purple-500/10 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:text-purple-300"
              >
                <FaTags size={12} aria-hidden="true" /> Gestionar categorías
              </button>
            </div>
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              selectedCategory={searchCategory}
              onCategoryChange={setSearchCategory}
              transactionType={searchType}
              onTypeChange={setSearchType}
              categories={categories || []}
              resultCount={filteredDocs.length}
              totalCount={(docs || []).length}
              selectedFilter={selectedFilter}
              onClear={clearTransactionFilters}
              onViewAll={viewAllTransactions}
              disabled={isDataFetching}
            />

            {isDataFetching ? (
              <TransactionListSkeleton />
            ) : !docs?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300" role="status">
                No hay movimientos en este período. Elegí otra fecha o consultá todo el historial.
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-900/50" role="status">
                <p className="font-bold text-slate-900 dark:text-slate-100">No encontramos movimientos</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Probá con menos palabras, otra categoría o buscá en todo el historial.
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
                    name={doc.expenseName}
                    amount={doc.amount}
                    date={doc.date}
                    comment={doc.comment}
                    category={doc.category}
                    customDetails={doc.customDetails || {}}
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

          </div>
          )}
        </div>
      </div>

      <AppFooter />

      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2, type: "tween" }}
      >
        <FloatingMenu
          openTransactionModal={openModal}
          openLitaModal={handleFloatingButtonClick}
          isModalOpen={isOpen || showModal}
        />

        {isOpen && (
          <GenericModal
            component={TransactionForm}
            name={name}
            amount={amount}
            edit={edit}
            comment={comment}
            category={category}
            customDetails={customDetails}
            setCustomDetails={setCustomDetails}
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
    </>
  );
}

export default Dashboard;
