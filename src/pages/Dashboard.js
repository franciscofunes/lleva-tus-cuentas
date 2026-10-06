import { motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import "tippy.js/dist/tippy.css";
import { FaArrowRight, FaChartPie, FaExchangeAlt, FaPlus } from "react-icons/fa";
import {
  getCategoriesDataAction,
  getDataAction,
  getPaymentDataAction,
} from "../actionCreators/databaseActions";
import BarChartWrapper from "../components/BarChartWrapper";
import Card from "../components/Card";
import ExpenseFilter from "../components/ExpenseFilter";
import FloatingMenu from "../components/FloatingMenu";
import GenericModal from "../components/GenericModal";
import LitaAssistantPanel from "../components/LitaAssitantPanel";
import SearchBar from "../components/SearchBar";
import TransactionForm from "../components/TransactionForm";
import AdvertisementContainer from "../components/AdvertisementContainer";
import QuickAccessCard from "../components/QuickAccessCard";
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
import {
  currencyFormater,
  currencyGenericFormater,
} from "../shared/utils/currencyFormater";
import ChartToggleMenu from "../components/ChartToogleMenu";
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

const ValueSkeleton = ({ wide = false }) => (
  <SkeletonBlock className={`mt-2 h-5 animate-pulse ${wide ? "w-40" : "w-24"}`} />
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

      <div className="grid lg:grid-cols-3 gap-5 items-start">
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
  const user = useSelector((state) => state.auth.user);
  const paymentData = useSelector((state) => state.database.paymentData);
  const isFetching = useSelector((state) => state.auth.isFetching);
  const isDataFetching = useSelector((state) => state.database.isDataFetching);
  const docs = useSelector((state) => state.database.docs);
  const categories = useSelector((state) => state.database.categories);

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
  const [selectedDate, setSelectedDate] = useState("");

  const [isCreditCardCategory, setIsCreditCardCategory] = useState(false);
  const [selectedExpirationDate, setSelectedExpirationDate] = useState("");
  const [selectedCloseDate, setSelectedCloseDate] = useState("");

  const [isBuyCurrenciesCategory, setIsBuyCurrenciesCategory] = useState(false);
  const [currencyQuantity, setCurrencyQuantity] = useState();
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState();
  const [currencySale, setCurrencySale] = useState(0);

  const [isDataVisible, setIsDataVisible] = useState(() => {
    const savedVisibility = sessionStorage.getItem("isDataVisible");
    return savedVisibility ? JSON.parse(savedVisibility) : true;
  });

  const [isCurrencyIncomeCategory, setIsCurrencyIncomeCategory] =
    useState(false);

  const [isSellCurrenciesCategory, setIsSellCurrenciesCategory] =
    useState(false);
  const [currencySellQuantity, setCurrencySellQuantity] = useState();
  const [currencySellRate, setCurrencySellRate] = useState();

  const [isOpen, setIsOpen] = useState(false);

  const [selectedChart, setSelectedChart] = useState("expenses");
  const transactionPreferenceKey = user?.uid
    ? `ltc:transactions:view:${user.uid}`
    : "ltc:transactions:view";
  const [collapsedSections, setCollapsedSections] = useState({
    summary: false,
    charts: false,
    transactions: false,
  });

  useEffect(() => {
    if (!user) return;
    try {
      const saved = JSON.parse(localStorage.getItem(transactionPreferenceKey) || "{}");
      setCollapsedSections((current) => ({
        ...current,
        ...(saved.collapsedSections || {}),
      }));
    } catch {}
  }, [user, transactionPreferenceKey]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(
      transactionPreferenceKey,
      JSON.stringify({ collapsedSections })
    );
  }, [user, transactionPreferenceKey, collapsedSections]);

  const toggleDashboardSection = (section) =>
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));

  const toggleDataVisibility = () => {
    const newVisibility = !isDataVisible;
    setIsDataVisible(newVisibility);
    sessionStorage.setItem("isDataVisible", JSON.stringify(newVisibility));
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
    if (user) {
      dispatch(getCategoriesDataAction());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(getDataAction(user.uid));
    }
  }, [user, dispatch]);

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
            doc.category.includes("Compra divisas") ||
            doc.category.includes(INGRESO_DIVISAS_CATEGORY)
        )
        .map((doc) => {
          const currencyQuantity = parseFloat(doc?.currencyQuantity);
          return isNaN(currencyQuantity) ? 0 : currencyQuantity;
        });

      const currencySale = docs
        .filter((doc) => doc.category.includes("Venta divisas"))
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

  const litaTransactionContext = useMemo(
    () => ({
      scope: "current-view",
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
    [currencyIncome, docs, expense, income, total]
  );

  if (user === null) return <Navigate to="/" />;

  if (isFetching) return <TransactionsPageSkeleton />;

  const handleFloatingButtonClick = () => {
    setShowModal(true);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setEdit(false);
    setName("");
    setAmount("");
    setComment("");
    setCategory("");
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
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 1 }}
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
          <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div
          id="left"
          className="w-full flex flex-col items-stretch"
        >
          <CollapsibleSection
            id="transactions-summary"
            eyebrow="Resumen"
            title="Balance y movimientos"
            description="Ingresos, gastos, inversión, balance y filtros del período."
            collapsed={collapsedSections.summary}
            onToggle={() => toggleDashboardSection("summary")}
            className="mb-5 font-Nunito"
          >
            <div className="flex items-center mb-5">
              {/* Ingresos */}
              <div className="flex flex-col justify-center items-center flex-grow">
                <h1 className="font-semibold text-2xl uppercase dark:text-zinc-100">
                  Ingresos
                </h1>
                {isDataFetching ? (
                  <ValueSkeleton />
                ) : (
                  <motion.p
                    initial={{ opacity: 0, filter: "blur(4px)" }} // Initial state with reduced opacity and slight blur
                    animate={{ opacity: 1, filter: "blur(0px)" }} // End state with full opacity and no blur
                    exit={{ opacity: 0, filter: "blur(4px)" }} // Exit state with reduced opacity and slight blur
                    transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition with a subtle duration
                    key={isDataVisible ? "expense-value" : "hidden-value"}
                    className="text-green-500 font-medium"
                  >
                    {isDataVisible ? `${currencyFormater(income)}` : "*******"}
                  </motion.p>
                )}
              </div>
              {/* Gastos */}
              <div className="flex flex-col justify-center items-center ml-4 flex-grow">
                <h1 className="font-semibold text-2xl uppercase dark:text-zinc-100">
                  Gastos
                </h1>
                {isDataFetching ? (
                  <ValueSkeleton />
                ) : (
                  <motion.p
                    initial={{ opacity: 0, filter: "blur(4px)" }} // Initial state with reduced opacity and slight blur
                    animate={{ opacity: 1, filter: "blur(0px)" }} // End state with full opacity and no blur
                    exit={{ opacity: 0, filter: "blur(4px)" }} // Exit state with reduced opacity and slight blur
                    transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition with a subtle duration
                    className="text-red-500 font-medium"
                    key={isDataVisible ? "expense-value" : "hidden-value"} // Key to trigger animation on state change
                  >
                    {isDataVisible ? `${currencyFormater(expense)}` : "*******"}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Inversión */}
            <div className="flex flex-col justify-center items-center mb-2">
              <h1 className="font-semibold text-2xl uppercase dark:text-zinc-100">
                Inversión
              </h1>
              {isDataFetching ? (
                <ValueSkeleton />
              ) : (
                <motion.p
                  initial={{ opacity: 0, filter: "blur(4px)" }} // Initial state with reduced opacity and slight blur
                  animate={{ opacity: 1, filter: "blur(0px)" }} // End state with full opacity and no blur
                  exit={{ opacity: 0, filter: "blur(4px)" }} // Exit state with reduced opacity and slight blur
                  transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition with a subtle duration
                  key={isDataVisible ? "expense-value" : "hidden-value"}
                  className="text-blue-500 font-medium"
                >
                  {isDataVisible
                    ? `${currencyGenericFormater(
                        "USD",
                        currencyIncome,
                        "en-US",
                        "USD"
                      )}`
                    : "*******"}
                </motion.p>
              )}
            </div>

            {/* Balance */}
            <div className="flex flex-col mb-4">
              <div className="flex justify-center items-center mb-2">
                <p className="text-gray-400 text-center text-lg">Balance</p>
                <button onClick={toggleDataVisibility} className="ml-2">
                  <motion.img
                    className="mb-1 h-5 w-5"
                    src={isDataVisible ? eyeHide : closeEye}
                    alt={isDataVisible ? "open eye" : "close eye"}
                    key={isDataVisible ? "open-eye" : "close-eye"} // Key for animation
                    initial={{ scale: 0.5, rotate: -180 }} // Initial state
                    animate={{ scale: 1, rotate: 0 }} // End state
                    transition={{ duration: 0.5, ease: "easeOut" }} // Animation properties
                  />
                </button>
              </div>

              <div className="flex flex-col gap-2 justify-center items-center">
                {isDataFetching ? (
                  <ValueSkeleton />
                ) : (
                  <motion.h2
                    initial={{ opacity: 0, filter: "blur(4px)" }} // Initial state with reduced opacity and slight blur
                    animate={{ opacity: 1, filter: "blur(0px)" }} // End state with full opacity and no blur
                    exit={{ opacity: 0, filter: "blur(4px)" }} // Exit state with reduced opacity and slight blur
                    transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition with a subtle duration
                    key={isDataVisible ? "expense-value" : "hidden-value"}
                    className={`text-2xl font-semibold text-center ${
                      total < 0 ? `text-red-500` : `text-green-500`
                    }`}
                  >
                    {isDataVisible ? currencyFormater(total) : "*******"}
                  </motion.h2>
                )}
              </div>
            </div>
            <ExpenseFilter />
          </CollapsibleSection>
          <CollapsibleSection
            id="transactions-charts"
            eyebrow="Visualización"
            title="Gráficos"
            description="Analizá tus movimientos con la visualización que prefieras."
            collapsed={collapsedSections.charts}
            onToggle={() => toggleDashboardSection("charts")}
            className="mb-5 font-Nunito"
          >
            {isDataFetching ? (
              <ChartSkeleton />
            ) : (
              docs && (
                <>
                  {/* Conditionally render the appropriate chart */}
                  {selectedChart &&
                    chartComponents[selectedChart] &&
                    React.createElement(chartComponents[selectedChart], {
                      chartData: docs,
                      categories,
                    })}

                  <ChartToggleMenu
                    selectedChart={selectedChart}
                    handleChartToggle={handleChartToggle}
                    chartComponents={chartComponents}
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
            <SearchBar />

            {isDataFetching ? (
              <TransactionListSkeleton />
            ) : (
              !docs ||
              (docs.length === 0 && (
                <div className="flex">
                  <p className="text-zinc-500 font-semibold text-lg">
                    Bienvenido, aún no registraste ninguna transacción. ¿Qué
                    estás esperando? ¡Empezá a controlar tus gastos! 💪
                  </p>
                </div>
              ))
            )}

            {!isDataFetching && docs?.map((doc) => {
              return (
                <div key={doc.id}>
                  <Card
                    id={doc.id}
                    name={doc.expenseName}
                    amount={doc.amount}
                    date={doc.date}
                    comment={doc.comment}
                    category={doc.category}
                    selectedDate={doc.selectedDate}
                    selectedExpirationDate={doc.selectedExpirationDate}
                    selectedCloseDate={doc.selectedCloseDate}
                    currencyExchangeRate={doc.currencyExchangeRate}
                    currencyQuantity={doc.currencyQuantity}
                    currencySellQuantity={doc.currencySellQuantity}
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
        </CollapsibleSection>

          </div>
        </div>
      </motion.div>

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
            closeModal={closeModal}
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
