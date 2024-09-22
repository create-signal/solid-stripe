import type { Stripe } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Show, createSignal, onMount } from 'solid-js'
import { Elements, Iban, useElements, useStripe } from 'solid-stripe'
import { action, redirect, useSubmission } from '@solidjs/router'
import { createPaymentIntent } from '~/lib/createPaymentIntent'
import Alert from '~/components/Alert'

export default function Page() {
  const [stripe, setStripe] = createSignal<Stripe | null>(null)

  onMount(async () => {
    const result = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    setStripe(result)
  })

  return (
    <>
      <h1 class="text-4xl font-normal leading-normal mt-0 mb-2">SEPA Example</h1>
      <Show when={stripe()} fallback={<div>Loading stripe...</div>}>
        <Elements stripe={stripe()!}>
          <CheckoutForm />
        </Elements>
      </Show>
    </>
  )
}

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()

  const paymentAction = action(async (form: FormData) => {
    const paymentIntent = await createPaymentIntent({
      amount: 2000,
      currency: 'eur',
      payment_method_types: ['sepa_debit'],
    })

    const result = await stripe()!.confirmSepaDebitPayment(paymentIntent.client_secret!, {
      payment_method: {
        sepa_debit: elements()!.getElement(Iban)!,
        billing_details: {
          name: form.get('name') as string,
          email: form.get('email') as string,
        },
      },
    })

    if (result.error) {
      // payment failed
      throw new Error(result.error.message)
    } else {
      return redirect(`/success?payment_intent=${result.paymentIntent.id}`)
    }
  })

  const submission = useSubmission(paymentAction)

  return (
    <>
      <Show when={submission.error}>
        <Alert message={submission.error.message} type="error" />
      </Show>
      <form action={paymentAction} class="flex flex-col gap-2.5 my-8" method="post">
        <input
          placeholder="Name"
          class="input input-bordered"
          name="name"
          disabled={submission.pending}
        />
        <input
          type="email"
          placeholder="Email"
          class="input input-bordered"
          name="email"
          disabled={submission.pending}
        />
        <Iban supportedCountries={['SEPA']} classes={{ base: 'stripe-input' }} />
        <button class="btn btn-primary" disabled={submission.pending}>
          {submission.pending ? 'Processing...' : 'Pay'}
        </button>
      </form>
      <div class="flex flex-col">
        <a
          class="link"
          target="_BLANK"
          href="https://github.com/wobsoriano/solid-stripe/blob/main/playground/src/routes/sepa.tsx"
        >
          View code
        </a>
      </div>
    </>
  )
}
