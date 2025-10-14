class Views::Users::Auth::Sessions::New < Views::Base
  def initialize(resource:)
    @resource = resource
  end

  def view_template
    Form(action: user_session_path, method: :post, class: "mx-auto max-w-md space-y-6 bg-card") do
      div(class: "flex flex-col gap-6") do
        # Email
        FormField do
          FormFieldLabel(for: :user_email) { "Email" }
          Input(name: "user[email]", id: :user_email, type: :email, required: true, autocomplete: "email", placeholder: "you@example.com")
          FormFieldHint { "Use your account email." }
          FormFieldError
        end

        # Password
        FormField do
          FormFieldLabel(for: :user_password) { "Password" }
          Input(name: "user[password]", id: :user_password, type: :password, required: true, autocomplete: "current-password", minlength: 8)
          FormFieldHint { "At least 8 characters." }
          FormFieldError
        end

        # Remember me
        FormField do
          div(class: "flex items-center gap-2") do
            Checkbox(name: "user[remember_me]", id: :user_remember_me, value: "1")
            FormFieldLabel(for: :user_remember_me) { "Remember me" }
          end
        end

        # Submit
        Button(type: :submit, class: "w-full") { "Sign in" }
      end
    end
  end
end
